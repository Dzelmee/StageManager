import type { User } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { hashIp } from "./crypto";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  instrument: string | null;
  consentVersion: string | null;
  consentedAt: string | null;
  marketingOptIn: boolean;
  createdAt: string;
  bandId: number;
};

export function toPublicUser(
  user: User,
  bandId: number
): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl,
    instrument: user.instrument,
    consentVersion: user.consentVersion,
    consentedAt: user.consentedAt?.toISOString() ?? null,
    marketingOptIn: user.marketingOptIn,
    createdAt: user.createdAt.toISOString(),
    bandId,
  };
}

type CreateAccountInput = {
  name: string;
  email: string;
  passwordHash: string | null;
  emailVerified?: boolean;
  consentVersion: string;
  marketingOptIn?: boolean;
};

/**
 * Cria a conta e o workspace pessoal na mesma transação.
 * Se a banda falhar, o usuário não fica órfão.
 */
export async function createAccount(
  input: CreateAccountInput
) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        emailVerified: input.emailVerified ?? false,
        consentVersion: input.consentVersion,
        consentedAt: new Date(),
        marketingOptIn: input.marketingOptIn ?? false,
      },
    });

    const band = await tx.band.create({
      data: {
        name: input.name || "Minha banda",
      },
    });

    await tx.bandMember.create({
      data: {
        bandId: band.id,
        userId: user.id,
        name: input.name,
        role: "Dono",
        email: input.email,
      },
    });

    return { user, band };
  });
}

/**
 * Exclusão real (LGPD): apaga o usuário e os workspaces em que ele
 * era o único integrante. Se houver outra pessoa na banda, apenas
 * remove o vínculo.
 */
export async function deleteAccount(userId: string) {
  const memberships = await prisma.bandMember.findMany({
    where: { userId },
    select: { bandId: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const { bandId } of memberships) {
      const otherMembers = await tx.bandMember.count({
        where: {
          bandId,
          userId: { not: userId },
        },
      });

      if (otherMembers > 0) {
        await tx.bandMember.deleteMany({
          where: { bandId, userId },
        });
        continue;
      }

      const setlists = await tx.setlist.findMany({
        where: { bandId },
        select: { id: true },
      });

      const setlistIds = setlists.map((item) => item.id);

      if (setlistIds.length > 0) {
        await tx.setlistSong.deleteMany({
          where: { setlistId: { in: setlistIds } },
        });
      }

      await tx.setlist.deleteMany({ where: { bandId } });
      await tx.show.deleteMany({ where: { bandId } });
      await tx.song.deleteMany({ where: { bandId } });
      await tx.equipment.deleteMany({ where: { bandId } });
      await tx.bandMember.deleteMany({ where: { bandId } });
      await tx.band.delete({ where: { id: bandId } });
    }

    // Sessões, tokens OAuth e tokens de conta caem por cascade.
    await tx.user.delete({ where: { id: userId } });
  });
}

export async function logAuthEvent(
  userId: string | null,
  type: string,
  ip: string | undefined
) {
  try {
    await prisma.authEvent.create({
      data: {
        userId,
        type,
        ipHash: hashIp(ip),
      },
    });
  } catch (error) {
    // Auditoria não pode derrubar login/cadastro.
    console.error("Erro ao registrar evento de autenticação:", error);
  }
}

export async function bandIdForUser(
  userId: string
): Promise<number | null> {
  const membership = await prisma.bandMember.findFirst({
    where: { userId },
    orderBy: { id: "asc" },
    select: { bandId: true },
  });

  return membership?.bandId ?? null;
}
