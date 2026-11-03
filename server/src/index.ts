import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma";

const app = express();

const PORT = 3333;

app.use(cors());
app.use(express.json());

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

app.get("/api/bands", async (_request, response) => {
  try {
    const bands = await prisma.band.findMany();

    response.json(bands);
  } catch (error) {
    console.error("Erro ao buscar bandas:", error);

    response.status(500).json({
      error: "Erro ao buscar bandas.",
    });
  }
});

app.post("/api/bands", async (request, response) => {
  try {
    const { name, genre } = request.body ?? {};

    if (typeof name !== "string" || !name.trim()) {
      response.status(400).json({
        error: "O nome da banda é obrigatório.",
      });
      return;
    }

    if (
      genre !== undefined &&
      genre !== null &&
      typeof genre !== "string"
    ) {
      response.status(400).json({
        error: "O gênero musical deve ser um texto.",
      });
      return;
    }

    const band = await prisma.band.create({
      data: {
        name: name.trim(),
        genre: typeof genre === "string"
          ? genre.trim() || null
          : null,
      },
    });

    response.status(201).json(band);
  } catch (error) {
    console.error("Erro ao cadastrar banda:", error);

    response.status(500).json({
      error: "Erro ao cadastrar banda.",
    });
  }
});

app.post("/api/songs", async (request, response) => {
  try {
    const { title, artist, bpm, key, tuning, duration, bandId } =
      request.body ?? {};

    if (typeof title !== "string" || !title.trim()) {
      response.status(400).json({
        error: "O título da música é obrigatório.",
      });
      return;
    }

    if (!Number.isInteger(bandId) || bandId <= 0) {
      response.status(400).json({
        error: "O ID da banda deve ser um número inteiro positivo.",
      });
      return;
    }

    const band = await prisma.band.findUnique({
      where: { id: bandId },
    });

    if (!band) {
      response.status(404).json({
        error: "Banda não encontrada.",
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
    const bandId = Number(request.query.bandId);

    if (!Number.isInteger(bandId) || bandId <= 0) {
      response.status(400).json({
        error: "Informe um bandId válido.",
      });
      return;
    }

    const songs = await prisma.song.findMany({
      where: { bandId },
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

    const existing = await prisma.song.findUnique({
      where: { id },
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

    if (!Number.isInteger(id) || id <= 0) {
      response.status(400).json({ error: "ID inválido." });
      return;
    }

    const existing = await prisma.song.findUnique({
      where: { id },
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

// Listar setlists de uma banda
app.get("/api/setlists", async (request, response) => {
  try {
    const bandId = Number(request.query.bandId);

    if (!Number.isInteger(bandId) || bandId <= 0) {
      response.status(400).json({
        error: "Informe um bandId válido.",
      });
      return;
    }

    const setlists = await prisma.setlist.findMany({
      where: { bandId },
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
    const { name, bandId, showId } = request.body ?? {};

    if (typeof name !== "string" || !name.trim()) {
      response.status(400).json({
        error: "O nome da setlist é obrigatório.",
      });
      return;
    }

    if (!Number.isInteger(bandId) || bandId <= 0) {
      response.status(400).json({
        error: "bandId inválido.",
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

    const band = await prisma.band.findUnique({
      where: { id: bandId },
    });

    if (!band) {
      response.status(404).json({
        error: "Banda não encontrada.",
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
    const setlistId = Number(request.params.id);
    const songId = request.body?.songId;

    if (!Number.isInteger(setlistId) || setlistId <= 0 ||
        !Number.isInteger(songId) || songId <= 0) {
      response.status(400).json({
        error: "IDs inválidos.",
      });
      return;
    }

    const setlist = await prisma.setlist.findUnique({
      where: { id: setlistId },
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
        bandId: setlist.bandId,
      },
    });

    if (!song) {
      response.status(404).json({
        error: "Música não encontrada nesta banda.",
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

    const setlist = await prisma.setlist.findUnique({
      where: { id },
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

    const formattedDuration = [
      hours,
      minutes,
      seconds,
    ]
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
    const songIds = request.body?.songIds;

    if (!Number.isInteger(setlistId) || setlistId <= 0) {
      response.status(400).json({ error: "ID da setlist inválido." });
      return;
    }

    if (
      !Array.isArray(songIds) ||
      !songIds.every((id) => Number.isInteger(id) && id > 0) ||
      new Set(songIds).size !== songIds.length
    ) {
      response.status(400).json({
        error: "Informe uma lista válida de IDs, sem duplicatas.",
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.setlistSong.findMany({
        where: { setlistId },
        select: { id: true, position: true },
      });

      const existingIds = existing.map((item) => item.id);

      if (
        existingIds.length !== songIds.length ||
        !existingIds.every((id) => songIds.includes(id))
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

      for (let index = 0; index < songIds.length; index++) {
        await tx.setlistSong.update({
          where: { id: songIds[index] },
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
        error: "Os IDs devem corresponder aos itens da setlist.",
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
    const bandId = Number(request.query.bandId);

    if (!Number.isInteger(bandId) || bandId <= 0) {
      response.status(400).json({
        error: "Informe um bandId válido.",
      });
      return;
    }

    const shows = await prisma.show.findMany({
      where: {
        bandId,
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
      bandId,
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

    if (!Number.isInteger(bandId) || bandId <= 0) {
      response.status(400).json({
        error: "ID da banda inválido.",
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

    const band = await prisma.band.findUnique({
      where: { id: bandId },
    });

    if (!band) {
      response.status(404).json({
        error: "Banda não encontrada.",
      });
      return;
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
    const showId = Number(request.params.id);

    if (!Number.isInteger(showId) || showId <= 0) {
      response.status(400).json({
        error: "ID do show inválido.",
      });
      return;
    }

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
      !Number.isInteger(duration) ||
      duration <= 0
    ) {
      response.status(400).json({
        error: "A duração deve ser um inteiro positivo.",
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

    const existingShow = await prisma.show.findUnique({
      where: { id: showId },
    });

    if (!existingShow) {
      response.status(404).json({
        error: "Show não encontrado.",
      });
      return;
    }

    const updatedShow = await prisma.show.update({
      where: { id: showId },
      data: {
        name: name.trim(),
        venue: venue.trim(),
        city: city?.trim() || null,
        date: new Date(date),
        showTime: showTime?.trim() || null,
        loadIn: loadIn?.trim() || null,
        soundcheck: soundcheck?.trim() || null,
        duration,
        status: status?.trim() || "Planejado",
        notes: notes?.trim() || null,
      },
    });

    response.json(updatedShow);
  } catch (error) {
    console.error("Erro ao editar show:", error);

    response.status(500).json({
      error: "Erro ao editar show.",
    });
  }
});

app.listen(PORT, () => {
  console.log("");
  console.log("=================================");
  console.log("  StageManager API");
  console.log("=================================");
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log(`Health:   http://localhost:${PORT}/api/health`);
  console.log("=================================");
  console.log("");
});