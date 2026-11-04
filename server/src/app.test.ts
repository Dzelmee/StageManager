import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import type { Server } from "node:http";

/**
 * Testes de integração da API.
 *
 * Usam um banco separado (`stagemanager_test`) para não apagar os dados
 * de desenvolvimento. O banco é criado e migrado automaticamente.
 *
 * Toda rota de dados exige sessão: os testes criam uma conta real pelo
 * endpoint /api/auth/register e reaproveitam o cookie HttpOnly.
 */

const defaultUrl =
  "postgresql://postgres:postgres@localhost:5432/stagemanager?schema=public";

const databaseUrl = process.env.DATABASE_URL ?? defaultUrl;

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  databaseUrl.replace(
    /\/stagemanager(\?|$)/,
    "/stagemanager_test$1"
  );

process.env.DATABASE_URL = testDatabaseUrl;

let server: Server;
let baseUrl: string;
let prisma: typeof import("./lib/prisma").prisma;

type ApiResponse<T = unknown> = {
  status: number;
  body: T;
};

type Cookie = string | null;

async function api<T = unknown>(
  route: string,
  init?: RequestInit,
  cookie: Cookie = null
): Promise<ApiResponse<T> & { cookie: Cookie }> {
  const headers = new Headers(init?.headers);

  if (init?.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  const response = await fetch(`${baseUrl}${route}`, {
    ...init,
    headers,
  });

  const text = await response.text();

  const setCookie =
    response.headers.getSetCookie?.()[0] ??
    response.headers.get("set-cookie") ??
    null;

  return {
    status: response.status,
    body: (text ? JSON.parse(text) : null) as T,
    cookie: setCookie ? setCookie.split(";")[0] : null,
  };
}

async function ensureTestDatabase() {
  const { Client } = await import("pg");

  const url = new URL(testDatabaseUrl);
  const databaseName = url.pathname.replace(/^\//, "");

  // `?schema=public` é específico do Prisma; o driver `pg` não usa.
  url.search = "";
  url.pathname = "/postgres";

  const client = new Client({ connectionString: url.toString() });

  await client.connect();

  try {
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName]
    );

    if (result.rowCount === 0) {
      await client.query(`CREATE DATABASE "${databaseName}"`);
    }
  } finally {
    await client.end();
  }
}

function runMigrations() {
  // Executa o CLI do Prisma pelo Node. `execFileSync` em `.cmd`
  // falha com EINVAL em versões recentes do Node no Windows.
  const cli = path.join(
    process.cwd(),
    "node_modules",
    "prisma",
    "build",
    "index.js"
  );

  execFileSync(process.execPath, [cli, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: "pipe",
  });
}

async function cleanDatabase() {
  await prisma.setlistSong.deleteMany();
  await prisma.setlist.deleteMany();
  await prisma.show.deleteMany();
  await prisma.song.deleteMany();
  await prisma.bandMember.deleteMany();
  await prisma.band.deleteMany();
  await prisma.authEvent.deleteMany();
  await prisma.accountToken.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

type RegisteredAccount = {
  cookie: string;
  user: { id: string; name: string; email: string; bandId: number };
};

let accountCounter = 0;

async function registerAccount(): Promise<RegisteredAccount> {
  accountCounter += 1;

  const email = `teste${accountCounter}.${Date.now()}@stagemanager.test`;
  const response = await api<{
    user: RegisteredAccount["user"];
  }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: `Músico ${accountCounter}`,
      email,
      password: "senhaSegura123",
      acceptedTerms: true,
      acceptedPrivacy: true,
    }),
  });

  assert.equal(response.status, 201);
  assert.ok(response.cookie, "registro deve criar cookie de sessão");
  assert.equal(response.body.user.email, email);

  return { cookie: response.cookie, user: response.body.user };
}

before(async () => {
  await ensureTestDatabase();
  runMigrations();

  const [{ default: app }, prismaModule] = await Promise.all([
    import("./app"),
    import("./lib/prisma"),
  ]);

  prisma = prismaModule.prisma;

  await cleanDatabase();

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

after(async () => {
  if (prisma) {
    await cleanDatabase();
    await prisma.$disconnect();
  }

  if (!server) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe("GET /api/health", () => {
  it("responde que a API está no ar", async () => {
    const response = await api<{ status: string }>("/api/health");

    assert.equal(response.status, 200);
    assert.equal(response.body.status, "ok");
  });
});

describe("autenticação", () => {
  it("bloqueia rotas de dados sem sessão", async () => {
    const response = await api<{ error: string }>("/api/songs");

    assert.equal(response.status, 401);
    assert.equal(response.body.error, "Faça login para continuar.");
  });

  it("cria conta e workspace no cadastro", async () => {
    const account = await registerAccount();

    const me = await api<{
      user: { bandId: number; email: string };
    }>("/api/auth/me", undefined, account.cookie);

    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, account.user.email);
    assert.equal(me.body.user.bandId, account.user.bandId);

    const bands = await api<Array<{ id: number; name: string }>>(
      "/api/bands",
      undefined,
      account.cookie
    );

    assert.equal(bands.status, 200);
    assert.equal(bands.body.length, 1);
    assert.equal(bands.body[0].id, account.user.bandId);
  });

  it("faz login com e-mail e senha", async () => {
    const account = await registerAccount();

    const login = await api<{ user: { id: string } }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          email: account.user.email,
          password: "senhaSegura123",
        }),
      }
    );

    assert.equal(login.status, 200);
    assert.equal(login.body.user.id, account.user.id);
    assert.ok(login.cookie);
  });

  it("rejeita senha incorreta", async () => {
    const account = await registerAccount();

    const login = await api<{ error: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: account.user.email,
        password: "senhaErrada123",
      }),
    });

    assert.equal(login.status, 401);
    assert.equal(login.body.error, "E-mail ou senha inválidos.");
  });
});

describe("POST /api/setlists/:id/songs", () => {
  it("recusa a mesma música duas vezes na mesma setlist", async () => {
    const { cookie, user } = await registerAccount();

    const song = await api<{ id: number }>(
      "/api/songs",
      {
        method: "POST",
        body: JSON.stringify({
          title: "Música repetida",
        }),
      },
      cookie
    );

    assert.equal(song.status, 201);

    const setlist = await prisma.setlist.create({
      data: { name: "Setlist de teste", bandId: user.bandId },
    });

    const first = await api(
      `/api/setlists/${setlist.id}/songs`,
      {
        method: "POST",
        body: JSON.stringify({ songId: song.body.id }),
      },
      cookie
    );

    assert.equal(first.status, 201);

    const second = await api<{ error: string }>(
      `/api/setlists/${setlist.id}/songs`,
      {
        method: "POST",
        body: JSON.stringify({ songId: song.body.id }),
      },
      cookie
    );

    assert.equal(second.status, 409);
    assert.equal(second.body.error, "Música já está na setlist.");
  });
});

describe("PUT /api/setlists/:id/reorder", () => {
  async function createSetlistWithThreeSongs() {
    const { cookie, user } = await registerAccount();

    const setlist = await prisma.setlist.create({
      data: { name: "Setlist", bandId: user.bandId },
    });

    const items: Array<{ id: number }> = [];

    for (const title of ["Primeira", "Segunda", "Terceira"]) {
      const song = await prisma.song.create({
        data: { title, bandId: user.bandId },
      });

      const response = await api<{ id: number }>(
        `/api/setlists/${setlist.id}/songs`,
        {
          method: "POST",
          body: JSON.stringify({ songId: song.id }),
        },
        cookie
      );

      items.push(response.body);
    }

    return { cookie, setlist, items };
  }

  it("reordena usando itemIds", async () => {
    const { cookie, setlist, items } =
      await createSetlistWithThreeSongs();
    const reversed = [...items].reverse().map((item) => item.id);

    const response = await api<Array<{ id: number }>>(
      `/api/setlists/${setlist.id}/reorder`,
      {
        method: "PUT",
        body: JSON.stringify({ itemIds: reversed }),
      },
      cookie
    );

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.map((item) => item.id),
      reversed
    );
  });

  it("mantém songIds como alias legado", async () => {
    const { cookie, setlist, items } =
      await createSetlistWithThreeSongs();
    const reversed = [...items].reverse().map((item) => item.id);

    const response = await api<Array<{ id: number }>>(
      `/api/setlists/${setlist.id}/reorder`,
      {
        method: "PUT",
        body: JSON.stringify({ songIds: reversed }),
      },
      cookie
    );

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.map((item) => item.id),
      reversed
    );
  });
});

describe("PUT /api/shows/:id", () => {
  it("atualiza só os campos enviados e preserva loadIn/soundcheck", async () => {
    const { cookie } = await registerAccount();

    const created = await api<{ id: number }>(
      "/api/shows",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Show original",
          venue: "Palco A",
          city: "São Paulo",
          date: "2026-12-01T20:00:00.000Z",
          loadIn: "16:00",
          soundcheck: "18:00",
          duration: 90,
        }),
      },
      cookie
    );

    assert.equal(created.status, 201);

    const updated = await api<{
      name: string;
      venue: string;
      loadIn: string | null;
      soundcheck: string | null;
      duration: number | null;
    }>(
      `/api/shows/${created.body.id}`,
      {
        method: "PUT",
        body: JSON.stringify({ venue: "Palco B" }),
      },
      cookie
    );

    assert.equal(updated.status, 200);
    assert.equal(updated.body.venue, "Palco B");
    assert.equal(updated.body.name, "Show original");
    assert.equal(updated.body.loadIn, "16:00");
    assert.equal(updated.body.soundcheck, "18:00");
    assert.equal(updated.body.duration, 90);
  });
});

describe("escopo por conta", () => {
  it("não permite excluir música de outra conta", async () => {
    const owner = await registerAccount();
    const intruder = await registerAccount();

    const song = await prisma.song.create({
      data: { title: "Protegida", bandId: owner.user.bandId },
    });

    const response = await api<{ error: string }>(
      `/api/songs/${song.id}`,
      { method: "DELETE" },
      intruder.cookie
    );

    assert.equal(response.status, 404);

    const stillExists = await prisma.song.findUnique({
      where: { id: song.id },
    });

    assert.ok(stillExists);
  });

  it("exclui a música quando a conta é dona", async () => {
    const owner = await registerAccount();

    const song = await prisma.song.create({
      data: { title: "Descartável", bandId: owner.user.bandId },
    });

    const response = await api(
      `/api/songs/${song.id}`,
      { method: "DELETE" },
      owner.cookie
    );

    assert.equal(response.status, 204);

    const deleted = await prisma.song.findUnique({
      where: { id: song.id },
    });

    assert.equal(deleted, null);
  });
});
