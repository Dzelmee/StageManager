import express from "express";
import cors from "cors";

import { prisma } from "./lib/prisma";
import { ALLOWED_ORIGINS, IS_PRODUCTION } from "./auth/config";
import { requireAuth } from "./auth/middleware";
import authRouter from "./routes/auth";

const app = express();

// Atrás do proxy/túnel (Cloudflare, Render, etc.) o IP real vem em
// X-Forwarded-For. `1` confia apenas no primeiro proxy.
app.set("trust proxy", 1);

app.disable("x-powered-by");

app.use(
  cors({
    origin(origin, callback) {
      // Requisições sem Origin (curl, apps nativos) e origens
      // explicitamente permitidas podem passar.
      if (!origin || ALLOWED_ORIGINS.has(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  })
);

app.use((_request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  if (IS_PRODUCTION) {
    response.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  next();
});

app.use(express.json({ limit: "256kb" }));
// A Apple responde com `form_post` no callback de login.
app.use(express.urlencoded({ extended: false, limit: "64kb" }));

app.get("/", (_request, response) => {
  response.json({
    name: "StageManager API",
    status: "online",
  });
});

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    application: "StageManager",
    timestamp: new Date().toISOString(),
  });
});

// Login, cadastro, perfil, LGPD e OAuth. Fica antes do guarda de
// sessão porque precisa ser acessível sem autenticação.
app.use("/api/auth", authRouter);

// A partir daqui, todo /api exige sessão válida.
app.use("/api", requireAuth);

app.get("/api/bands", async (request, response) => {
  try {
    const bands = await prisma.band.findMany({
      where: {
        members: { some: { userId: request.auth!.user.id } },
      },
      orderBy: { id: "asc" },
    });

    response.json(bands);
  } catch (error) {
    console.error("Erro ao buscar bandas:", error);

    response.status(500).json({
      error: "Erro ao buscar bandas.",
    });
  }
});

app.post("/api/songs", async (request, response) => {
  try {
    const bandId = request.auth!.bandId;
    const { title, artist, bpm, key, tuning, duration } =
      request.body ?? {};

    if (typeof title !== "string" || !title.trim()) {
      response.status(400).json({
        error: "O título da música é obrigatório.",
      });
      return;
    }

    const song = await prisma.song.create({
      data: {
        title: title.trim(),
        artist: artist ?? null,
        bpm: bpm ?? null,
        key: key ?? null,
        tuning: tuning ?? null,
        duration: duration ?? null,
        bandId,
      },
    });

    response.status(201).json(song);
  } catch (error) {
    console.error("Erro ao cadastrar música:", error);

    response.status(500).json({
      error: "Erro ao cadastrar música.",
    });
  }
});

app.get("/api/songs", async (request, response) => {
  try {
    const songs = await prisma.song.findMany({
      where: { bandId: request.auth!.bandId },
      orderBy: { title: "asc" },
    });

    response.json(songs);
  } catch (error) {
    console.error("Erro ao buscar músicas:", error);

    response.status(500).json({
      error: "Erro ao buscar músicas.",
    });
  }
});

app.put("/api/songs/:id", async (request, response) => {
  try {
    const id = Number(request.params.id);
    const bandId = request.auth!.bandId;

    if (!Number.isInteger(id) || id <= 0) {
      response.status(400).json({ error: "ID inválido." });
      return;
    }

    const { title, artist, bpm, key, tuning, duration, status } =
      request.body ?? {};

    const data: {
      title?: string;
      artist?: string | null;
      bpm?: number | null;
      key?: string | null;
      tuning?: string | null;
      duration?: number | null;
      status?: string;
    } = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        response.status(400).json({ error: "Título inválido." });
        return;
      }
      data.title = title.trim();
    }

    for (const [field, value] of Object.entries({
      artist,
      key,
      tuning,
    })) {
      if (value !== undefined) {
        if (value !== null && typeof value !== "string") {
          response.status(400).json({
            error: `${field} deve ser um texto.`,
          });
          return;
        }
        Object.assign(data, { [field]: value });
      }
    }

    for (const [field, value] of Object.entries({
      bpm,
      duration,
    })) {
      if (value !== undefined) {
        if (
          value !== null &&
          (!Number.isInteger(value) || value < 0)
        ) {
          response.status(400).json({
            error: `${field} deve ser um inteiro não negativo.`,
          });
          return;
        }
        Object.assign(data, { [field]: value });
      }
    }

    if (status !== undefined) {
      if (
        typeof status !== "string" ||
        !["Pronta", "Ensaiando", "Nova", "Pausada"].includes(status)
      ) {
        response.status(400).json({ error: "Status inválido." });
        return;
      }
      data.status = status;
    }

    const existing = await prisma.song.findFirst({
      where: { id, bandId },
    });

    if (!existing) {
      response.status(404).json({ error: "Música não encontrada." });
      return;
    }

    const song = await prisma.song.update({
      where: { id },
      data,
    });

    response.json(song);
  } catch (error) {
    console.error("Erro ao editar música:", error);
    response.status(500).json({ error: "Erro ao editar música." });
  }
});

app.delete("/api/songs/:id", async (request, response) => {
  try {
    const id = Number(request.params.id);
    const bandId = request.auth!.bandId;

    if (!Number.isInteger(id) || id <= 0) {
      response.status(400).json({ error: "ID inválido." });
      return;
    }

    const existing = await prisma.song.findFirst({
      where: { id, bandId },
    });

    if (!existing) {
      response.status(404).json({ error: "Música não encontrada." });
      return;
    }

    const linked = await prisma.setlistSong.count({
      where: { songId: id },
    });

    if (linked > 0) {
      response.status(409).json({
        error: "Remova a música das setlists antes de excluí-la.",
      });
      return;
    }

    await prisma.song.delete({ where: { id } });

    response.status(204).send();
  } catch (error) {
    console.error("Erro ao excluir música:", error);
    response.status(500).json({ error: "Erro ao excluir música." });
  }
});

// =====================================
// STAGEMANAGER - API DE SETLISTS
// =====================================

// Listar setlists da banda da sessão
app.get("/api/setlists", async (request, response) => {
  try {
    const setlists = await prisma.setlist.findMany({
      where: { bandId: request.auth!.bandId },
      include: {
        songs: {
          orderBy: { position: "asc" },
          include: {
            song: true,
          },
        },
        show: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    response.json(setlists);
  } catch (error) {
    console.error("Erro ao listar setlists:", error);

    response.status(500).json({
      error: "Erro ao listar setlists.",
    });
  }
});

// Criar uma nova setlist
app.post("/api/setlists", async (request, response) => {
  try {
    const bandId = request.auth!.bandId;
    const { name, showId } = request.body ?? {};

    if (typeof name !== "string" || !name.trim()) {
      response.status(400).json({
        error: "O nome da setlist é obrigatório.",
      });
      return;
    }

    if (
      showId !== undefined &&
      showId !== null &&
      (!Number.isInteger(showId) || showId <= 0)
    ) {
      response.status(400).json({
        error: "showId inválido.",
      });
      return;
    }

    if (showId != null) {
      const show = await prisma.show.findFirst({
        where: { id: showId, bandId },
      });

      if (!show) {
        response.status(404).json({
          error: "Show não encontrado para esta banda.",
        });
        return;
      }
    }

    const setlist = await prisma.setlist.create({
      data: {
        name: name.trim(),
        bandId,
        ...(showId != null ? { showId } : {}),
      },
      include: {
        songs: {
          include: {
            song: true,
          },
        },
        show: true,
      },
    });

    response.status(201).json(setlist);
  } catch (error) {
    console.error("Erro ao criar setlist:", error);

    response.status(500).json({
      error: "Erro ao criar setlist.",
    });
  }
});

// =====================================
// ADICIONAR MÚSICA À SETLIST
// =====================================

app.post("/api/setlists/:id/songs", async (request, response) => {
  try {
    const bandId = request.auth!.bandId;
    const setlistId = Number(request.params.id);
    const songId = request.body?.songId;

    if (
      !Number.isInteger(setlistId) ||
      setlistId <= 0 ||
      !Number.isInteger(songId) ||
      songId <= 0
    ) {
      response.status(400).json({
        error: "IDs inválidos.",
      });
      return;
    }

    const setlist = await prisma.setlist.findFirst({
      where: { id: setlistId, bandId },
    });

    if (!setlist) {
      response.status(404).json({
        error: "Setlist não encontrada.",
      });
      return;
    }

    const song = await prisma.song.findFirst({
      where: {
        id: songId,
        bandId,
      },
    });

    if (!song) {
      response.status(404).json({
        error: "Música não encontrada nesta banda.",
      });
      return;
    }

    const duplicate = await prisma.setlistSong.findFirst({
      where: { setlistId, songId },
    });

    if (duplicate) {
      response.status(409).json({
        error: "Música já está na setlist.",
      });
      return;
    }

    const lastSong = await prisma.setlistSong.findFirst({
      where: { setlistId },
      orderBy: { position: "desc" },
    });

    const position = (lastSong?.position ?? 0) + 1;

    const item = await prisma.setlistSong.create({
      data: {
        setlistId,
        songId,
        position,
      },
      include: {
        song: true,
      },
    });

    response.status(201).json(item);
  } catch (error) {
    console.error("Erro ao adicionar música:", error);
    response.status(500).json({
      error: "Erro ao adicionar música à setlist.",
    });
  }
});

// =====================================
// DURAÇÃO TOTAL DA SETLIST
// =====================================

app.get("/api/setlists/:id/duration", async (request, response) => {
  try {
    const id = Number(request.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      response.status(400).json({
        error: "ID inválido.",
      });
      return;
    }

    const setlist = await prisma.setlist.findFirst({
      where: { id, bandId: request.auth!.bandId },
      include: {
        songs: {
          include: {
            song: true,
          },
        },
      },
    });

    if (!setlist) {
      response.status(404).json({
        error: "Setlist não encontrada.",
      });
      return;
    }

    const totalSeconds = setlist.songs.reduce(
      (total, item) => total + (item.song.duration ?? 0),
      0
    );

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formattedDuration = [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");

    response.json({
      setlistId: setlist.id,
      name: setlist.name,
      totalSongs: setlist.songs.length,
      totalSeconds,
      formattedDuration,
    });
  } catch (error) {
    console.error("Erro ao calcular duração:", error);

    response.status(500).json({
      error: "Erro ao calcular duração da setlist.",
    });
  }
});

// =====================================
// REMOVER MÚSICA DE UMA SETLIST
// =====================================

app.delete(
  "/api/setlists/:id/songs/:itemId",
  async (request, response) => {
    try {
      const bandId = request.auth!.bandId;
      const setlistId = Number(request.params.id);
      const itemId = Number(request.params.itemId);

      if (
        !Number.isInteger(setlistId) ||
        setlistId <= 0 ||
        !Number.isInteger(itemId) ||
        itemId <= 0
      ) {
        response.status(400).json({
          error: "IDs inválidos.",
        });
        return;
      }

      const setlist = await prisma.setlist.findFirst({
        where: { id: setlistId, bandId },
        select: { id: true },
      });

      if (!setlist) {
        response.status(404).json({
          error: "Setlist não encontrada.",
        });
        return;
      }

      const item = await prisma.setlistSong.findFirst({
        where: {
          id: itemId,
          setlistId,
        },
      });

      if (!item) {
        response.status(404).json({
          error: "Música não encontrada nesta setlist.",
        });
        return;
      }

      await prisma.$transaction(async (tx) => {
        await tx.setlistSong.delete({
          where: { id: itemId },
        });

        // Reorganiza as posições restantes.
        const remaining = await tx.setlistSong.findMany({
          where: { setlistId },
          orderBy: { position: "asc" },
        });

        // Usa posições temporárias para evitar
        // conflitos com a restrição de unicidade.
        const maxPosition = remaining.reduce(
          (max, song) => Math.max(max, song.position),
          0
        );

        const offset = maxPosition + remaining.length + 1;

        for (const song of remaining) {
          await tx.setlistSong.update({
            where: { id: song.id },
            data: { position: song.position + offset },
          });
        }

        for (let index = 0; index < remaining.length; index++) {
          await tx.setlistSong.update({
            where: { id: remaining[index].id },
            data: { position: index + 1 },
          });
        }
      });

      response.status(204).send();
    } catch (error) {
      console.error("Erro ao remover música da setlist:", error);

      response.status(500).json({
        error: "Erro ao remover música da setlist.",
      });
    }
  }
);

// =====================================
// REORDENAR MÚSICAS DA SETLIST
// =====================================

app.put("/api/setlists/:id/reorder", async (request, response) => {
  try {
    const setlistId = Number(request.params.id);
    const bandId = request.auth!.bandId;

    // `songIds` é o contrato legado. O correto é `itemIds`,
    // porque os valores são IDs de SetlistSong, não de Song.
    const itemIds = request.body?.itemIds ?? request.body?.songIds;

    if (!Number.isInteger(setlistId) || setlistId <= 0) {
      response.status(400).json({ error: "ID da setlist inválido." });
      return;
    }

    if (
      !Array.isArray(itemIds) ||
      !itemIds.every((id) => Number.isInteger(id) && id > 0) ||
      new Set(itemIds).size !== itemIds.length
    ) {
      response.status(400).json({
        error:
          "Informe itemIds: lista válida de IDs de itens da setlist, sem duplicatas.",
      });
      return;
    }

    const setlist = await prisma.setlist.findFirst({
      where: { id: setlistId, bandId },
    });

    if (!setlist) {
      response.status(404).json({ error: "Setlist não encontrada." });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.setlistSong.findMany({
        where: { setlistId },
        select: { id: true, position: true },
      });

      const existingIds = existing.map((item) => item.id);

      if (
        existingIds.length !== itemIds.length ||
        !existingIds.every((id) => itemIds.includes(id))
      ) {
        return null;
      }

      // Move primeiro para posições temporárias,
      // evitando conflitos com @@unique([setlistId, position]).
      const maxPosition = existing.reduce(
        (max, item) => Math.max(max, item.position),
        0
      );

      const offset = maxPosition + existing.length + 1;

      for (const item of existing) {
        await tx.setlistSong.update({
          where: { id: item.id },
          data: { position: item.position + offset },
        });
      }

      for (let index = 0; index < itemIds.length; index++) {
        await tx.setlistSong.update({
          where: { id: itemIds[index] },
          data: { position: index + 1 },
        });
      }

      return tx.setlistSong.findMany({
        where: { setlistId },
        orderBy: { position: "asc" },
        include: { song: true },
      });
    });

    if (result === null) {
      response.status(400).json({
        error:
          "Os itemIds devem corresponder aos itens desta setlist.",
      });
      return;
    }

    response.json(result);
  } catch (error) {
    console.error("Erro ao reordenar setlist:", error);
    response.status(500).json({
      error: "Erro ao reordenar músicas.",
    });
  }
});

// =====================================
// SHOWS - LISTAR SHOWS DA BANDA
// =====================================

app.get("/api/shows", async (request, response) => {
  try {
    const shows = await prisma.show.findMany({
      where: {
        bandId: request.auth!.bandId,
      },
      orderBy: {
        date: "asc",
      },
      include: {
        setlists: {
          include: {
            songs: {
              orderBy: {
                position: "asc",
              },
              include: {
                song: true,
              },
            },
          },
        },
      },
    });

    response.json(shows);
  } catch (error) {
    console.error("Erro ao buscar shows:", error);

    response.status(500).json({
      error: "Erro ao buscar shows.",
    });
  }
});

// =====================================
// SHOWS - CRIAR NOVO SHOW
// =====================================

app.post("/api/shows", async (request, response) => {
  try {
    const bandId = request.auth!.bandId;
    const {
      name,
      venue,
      city,
      date,
      showTime,
      loadIn,
      soundcheck,
      duration,
      status,
      notes,
    } = request.body ?? {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof venue !== "string" ||
      !venue.trim()
    ) {
      response.status(400).json({
        error: "Nome e local do show são obrigatórios.",
      });
      return;
    }

    if (
      typeof date !== "string" ||
      !date.trim() ||
      Number.isNaN(Date.parse(date))
    ) {
      response.status(400).json({
        error: "Data inválida. Informe uma data ISO 8601.",
      });
      return;
    }

    if (
      duration !== undefined &&
      duration !== null &&
      (!Number.isInteger(duration) || duration < 0)
    ) {
      response.status(400).json({
        error: "A duração deve ser um inteiro não negativo.",
      });
      return;
    }

    const optionalTexts = {
      city,
      showTime,
      loadIn,
      soundcheck,
      status,
      notes,
    };

    for (const [field, value] of Object.entries(optionalTexts)) {
      if (
        value !== undefined &&
        value !== null &&
        typeof value !== "string"
      ) {
        response.status(400).json({
          error: `${field} deve ser um texto.`,
        });
        return;
      }
    }

    const show = await prisma.show.create({
      data: {
        name: name.trim(),
        venue: venue.trim(),
        city: city?.trim() || null,
        date: new Date(date),
        showTime: showTime?.trim() || null,
        loadIn: loadIn?.trim() || null,
        soundcheck: soundcheck?.trim() || null,
        duration: duration ?? null,
        status: status?.trim() || "Planejado",
        notes: notes?.trim() || null,
        bandId,
      },
    });

    response.status(201).json(show);
  } catch (error) {
    console.error("Erro ao criar show:", error);

    response.status(500).json({
      error: "Erro ao criar show.",
    });
  }
});

app.put("/api/shows/:id", async (request, response) => {
  try {
    const bandId = request.auth!.bandId;
    const showId = Number(request.params.id);

    if (!Number.isInteger(showId) || showId <= 0) {
      response.status(400).json({
        error: "ID do show inválido.",
      });
      return;
    }

    const body = request.body ?? {};

    const {
      name,
      venue,
      city,
      date,
      showTime,
      loadIn,
      soundcheck,
      duration,
      status,
      notes,
    } = body;

    if (
      name !== undefined &&
      (typeof name !== "string" || !name.trim())
    ) {
      response.status(400).json({ error: "Nome inválido." });
      return;
    }

    if (
      venue !== undefined &&
      (typeof venue !== "string" || !venue.trim())
    ) {
      response.status(400).json({ error: "Local inválido." });
      return;
    }

    if (
      date !== undefined &&
      (typeof date !== "string" ||
        !date.trim() ||
        Number.isNaN(Date.parse(date)))
    ) {
      response.status(400).json({
        error: "Data inválida. Informe uma data ISO 8601.",
      });
      return;
    }

    if (
      duration !== undefined &&
      duration !== null &&
      (!Number.isInteger(duration) || duration <= 0)
    ) {
      response.status(400).json({
        error: "A duração deve ser um inteiro positivo.",
      });
      return;
    }

    for (const [field, value] of Object.entries({
      city,
      showTime,
      loadIn,
      soundcheck,
      status,
      notes,
    })) {
      if (
        value !== undefined &&
        value !== null &&
        typeof value !== "string"
      ) {
        response.status(400).json({
          error: `${field} deve ser um texto.`,
        });
        return;
      }
    }

    const existingShow = await prisma.show.findFirst({
      where: { id: showId, bandId },
    });

    if (!existingShow) {
      response.status(404).json({
        error: "Show não encontrado.",
      });
      return;
    }

    // Atualização parcial: só grava os campos enviados.
    // Assim um PUT sem `loadIn`/`soundcheck` não apaga esses dados.
    const data: {
      name?: string;
      venue?: string;
      city?: string | null;
      date?: Date;
      showTime?: string | null;
      loadIn?: string | null;
      soundcheck?: string | null;
      duration?: number | null;
      status?: string;
      notes?: string | null;
    } = {};

    if (name !== undefined) {
      data.name = name.trim();
    }

    if (venue !== undefined) {
      data.venue = venue.trim();
    }

    if (city !== undefined) {
      data.city = city === null ? null : city.trim() || null;
    }

    if (date !== undefined) {
      data.date = new Date(date);
    }

    if (showTime !== undefined) {
      data.showTime =
        showTime === null ? null : showTime.trim() || null;
    }

    if (loadIn !== undefined) {
      data.loadIn =
        loadIn === null ? null : loadIn.trim() || null;
    }

    if (soundcheck !== undefined) {
      data.soundcheck =
        soundcheck === null ? null : soundcheck.trim() || null;
    }

    if (duration !== undefined) {
      data.duration = duration;
    }

    if (status !== undefined) {
      data.status =
        status === null ? "Planejado" : status.trim() || "Planejado";
    }

    if (notes !== undefined) {
      data.notes =
        notes === null ? null : notes.trim() || null;
    }

    const updatedShow = await prisma.show.update({
      where: { id: showId },
      data,
    });

    response.json(updatedShow);
  } catch (error) {
    console.error("Erro ao editar show:", error);

    response.status(500).json({
      error: "Erro ao editar show.",
    });
  }
});

export default app;
