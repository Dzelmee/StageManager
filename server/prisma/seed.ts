import "dotenv/config";

import { prisma } from "../src/lib/prisma";

/**
 * Seed mínimo para o ambiente de desenvolvimento.
 *
 * O frontend usa `bandId = 1` em todas as chamadas e espera uma
 * setlist geral (showId = null) para montar o repertório do dia a dia.
 * Este script garante que esses dois registros existam sem duplicar
 * dados quando roda mais de uma vez.
 */
async function main() {
  const band = await prisma.band.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Banda Exemplo",
      genre: "Rock",
    },
  });

  console.log(`Banda pronta: #${band.id} ${band.name}`);

  const generalSetlist = await prisma.setlist.findFirst({
    where: {
      bandId: band.id,
      showId: null,
    },
  });

  if (generalSetlist) {
    console.log(`Setlist geral já existe: #${generalSetlist.id}`);
  } else {
    const created = await prisma.setlist.create({
      data: {
        name: "Setlist Geral",
        bandId: band.id,
      },
    });

    console.log(`Setlist geral criada: #${created.id}`);
  }

  // Ajusta as sequences depois de inserir IDs explícitos.
  await prisma.$queryRawUnsafe(
    `SELECT setval(
       pg_get_serial_sequence('"Band"', 'id'),
       (SELECT COALESCE(MAX(id), 1) FROM "Band")
     )`
  );

  await prisma.$queryRawUnsafe(
    `SELECT setval(
       pg_get_serial_sequence('"Setlist"', 'id'),
       (SELECT COALESCE(MAX(id), 1) FROM "Setlist")
     )`
  );
}

main()
  .catch((error) => {
    console.error("Erro ao executar o seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
