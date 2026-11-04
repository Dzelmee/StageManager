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

async function api<T = unknown>(
  route: string,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(`${baseUrl}${route}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const text = await response.text();

  return {
    status: response.status,
    body: (text ? JSON.parse(text) : null) as T,
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
  await prisma.band.deleteMany();
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

describe("POST /api/setlists/:id/songs", () => {
  it("recusa a mesma música duas vezes na mesma setlist", async () => {
    const band = await prisma.band.create({
      data: { name: "Banda de teste" },
    });

    const setlist = await prisma.setlist.create({
      data: { name: "Setlist de teste", bandId: band.id },
    });

    const song = await api<{ id: number }>("/api/songs", {
      method: "POST",
      body: JSON.stringify({
        title: "Música repetida",
        bandId: band.id,
      }),
    });

    assert.equal(song.status, 201);

    const first = await api(`/api/setlists/${setlist.id}/songs`, {
      method: "POST",
      body: JSON.stringify({ songId: song.body.id }),
    });

    assert.equal(first.status, 201);

    const second = await api<{ error: string }>(
      `/api/setlists/${setlist.id}/songs`,
      {
        method: "POST",
        body: JSON.stringify({ songId: song.body.id }),
      }
    );

    assert.equal(second.status, 409);
    assert.equal(second.body.error, "Música já está na setlist.");
  });
});

describe("PUT /api/setlists/:id/reorder", () => {
  async function createSetlistWithThreeSongs() {
    const band = await prisma.band.create({
      data: { name: `Banda ${Math.random()}` },
    });

    const setlist = await prisma.setlist.create({
      data: { name: "Setlist", bandId: band.id },
    });

    const items: Array<{ id: number }> = [];

    for (const title of ["Primeira", "Segunda", "Terceira"]) {
      const song = await prisma.song.create({
        data: { title, bandId: band.id },
      });

      const response = await api<{ id: number }>(
        `/api/setlists/${setlist.id}/songs`,
        {
          method: "POST",
          body: JSON.stringify({ songId: song.id }),
        }
      );

      items.push(response.body);
    }

    return { band, setlist, items };
  }

  it("reordena usando itemIds", async () => {
    const { setlist, items } = await createSetlistWithThreeSongs();
    const reversed = [...items].reverse().map((item) => item.id);

    const response = await api<Array<{ id: number }>>(
      `/api/setlists/${setlist.id}/reorder`,
      {
        method: "PUT",
        body: JSON.stringify({ itemIds: reversed }),
      }
    );

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.map((item) => item.id),
      reversed
    );
  });

  it("mantém songIds como alias legado", async () => {
    const { setlist, items } = await createSetlistWithThreeSongs();
    const reversed = [...items].reverse().map((item) => item.id);

    const response = await api<Array<{ id: number }>>(
      `/api/setlists/${setlist.id}/reorder`,
      {
        method: "PUT",
        body: JSON.stringify({ songIds: reversed }),
      }
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
    const band = await prisma.band.create({
      data: { name: "Banda de show" },
    });

    const created = await api<{ id: number }>("/api/shows", {
      method: "POST",
      body: JSON.stringify({
        name: "Show original",
        venue: "Palco A",
        city: "São Paulo",
        date: "2026-12-01T20:00:00.000Z",
        loadIn: "16:00",
        soundcheck: "18:00",
        duration: 90,
        bandId: band.id,
      }),
    });

    assert.equal(created.status, 201);

    const updated = await api<{
      name: string;
      venue: string;
      loadIn: string | null;
      soundcheck: string | null;
      duration: number | null;
    }>(`/api/shows/${created.body.id}`, {
      method: "PUT",
      body: JSON.stringify({ venue: "Palco B" }),
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.venue, "Palco B");
    assert.equal(updated.body.name, "Show original");
    assert.equal(updated.body.loadIn, "16:00");
    assert.equal(updated.body.soundcheck, "18:00");
    assert.equal(updated.body.duration, 90);
  });
});

describe("escopo por banda", () => {
  it("não permite excluir música de outra banda", async () => {
    const owner = await prisma.band.create({
      data: { name: "Dona da música" },
    });

    const other = await prisma.band.create({
      data: { name: "Outra banda" },
    });

    const song = await prisma.song.create({
      data: { title: "Protegida", bandId: owner.id },
    });

    const response = await api<{ error: string }>(
      `/api/songs/${song.id}?bandId=${other.id}`,
      { method: "DELETE" }
    );

    assert.equal(response.status, 404);

    const stillExists = await prisma.song.findUnique({
      where: { id: song.id },
    });

    assert.ok(stillExists);
  });

  it("exclui a música quando a banda confere", async () => {
    const band = await prisma.band.create({
      data: { name: "Banda correta" },
    });

    const song = await prisma.song.create({
      data: { title: "Descartável", bandId: band.id },
    });

    const response = await api(
      `/api/songs/${song.id}?bandId=${band.id}`,
      { method: "DELETE" }
    );

    assert.equal(response.status, 204);

    const deleted = await prisma.song.findUnique({
      where: { id: song.id },
    });

    assert.equal(deleted, null);
  });
});
