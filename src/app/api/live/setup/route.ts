import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isHost } from "@/lib/live-host";
import { getActiveGame } from "@/lib/live-game";
import { byPlayingOrder } from "@/lib/live-rounds";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isHost()) return NextResponse.json({ error: "Host PIN required" }, { status: 401 });
  const game = await getActiveGame();
  const [players, prompts] = await Promise.all([
    prisma.gamePlayer.findMany({
      where: { gameId: game.id },
      orderBy: { seatOrder: "asc" },
      select: { id: true, name: true, seatOrder: true, deviceId: true },
    }),
    prisma.gamePrompt.findMany({
      where: { gameId: game.id },
      select: { id: true, round: true, text: true, sortOrder: true, isFinale: true, imageUrl: true },
    }),
  ]);
  // Playing order, not alphabetical by round. See src/lib/live-rounds.ts.
  prompts.sort(byPlayingOrder);
  return NextResponse.json(
    {
      game: {
        id: game.id, mode: game.mode, name: game.name, beltText: game.beltText,
        timerSeconds: game.timerSeconds, answerMaxLength: game.answerMaxLength,
      },
      players,
      // Only whether a photo exists, never the data URL itself.
      prompts: prompts.map((p) => ({ ...p, imageUrl: undefined, hasPhoto: !!p.imageUrl })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  if (!isHost()) return NextResponse.json({ error: "Host PIN required" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const game = await getActiveGame();

  switch (String(body.action)) {
    case "SAVE_GAME":
      await prisma.game.update({
        where: { id: game.id },
        data: {
          name: String(body.name ?? game.name).slice(0, 60) || game.name,
          beltText: String(body.beltText ?? game.beltText).slice(0, 60),
          timerSeconds: Math.min(300, Math.max(10, Number(body.timerSeconds) || game.timerSeconds)),
        },
      });
      return NextResponse.json({ ok: true });

    case "ADD_PLAYER": {
      const count = await prisma.gamePlayer.count({ where: { gameId: game.id } });
      await prisma.gamePlayer.create({
        data: { gameId: game.id, name: String(body.name ?? "New player").slice(0, 40), seatOrder: count },
      });
      return NextResponse.json({ ok: true });
    }

    case "SAVE_PLAYER":
      await prisma.gamePlayer.update({
        where: { id: String(body.id) },
        data: { name: String(body.name ?? "").slice(0, 40) },
      });
      return NextResponse.json({ ok: true });

    case "DELETE_PLAYER":
      await prisma.gamePlayer.delete({ where: { id: String(body.id) } });
      return NextResponse.json({ ok: true });

    case "ADD_PROMPT": {
      const round = ["R1", "R2", "BELT", "BONUS"].includes(String(body.round)) ? String(body.round) : "R1";
      const count = await prisma.gamePrompt.count({ where: { gameId: game.id, round } });
      await prisma.gamePrompt.create({
        data: {
          gameId: game.id, round, sortOrder: count,
          text: String(body.text ?? "").slice(0, 300),
          imageUrl: body.imageUrl ? String(body.imageUrl) : null,
          isFinale: !!body.isFinale,
        },
      });
      return NextResponse.json({ ok: true });
    }

    case "SAVE_PROMPT":
      await prisma.gamePrompt.update({
        where: { id: String(body.id) },
        data: {
          text: String(body.text ?? "").slice(0, 300),
          isFinale: !!body.isFinale,
          ...(body.imageUrl !== undefined
            ? { imageUrl: body.imageUrl ? String(body.imageUrl) : null }
            : {}),
        },
      });
      return NextResponse.json({ ok: true });

    case "DELETE_PROMPT":
      await prisma.gamePrompt.delete({ where: { id: String(body.id) } });
      return NextResponse.json({ ok: true });

    case "MOVE_PROMPT": {
      const p = await prisma.gamePrompt.findUnique({ where: { id: String(body.id) } });
      if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const dir = Number(body.direction) < 0 ? -1 : 1;
      const neighbour = await prisma.gamePrompt.findFirst({
        where: {
          gameId: game.id, round: p.round,
          sortOrder: dir < 0 ? { lt: p.sortOrder } : { gt: p.sortOrder },
        },
        orderBy: { sortOrder: dir < 0 ? "desc" : "asc" },
      });
      if (!neighbour) return NextResponse.json({ ok: true });
      await prisma.$transaction([
        prisma.gamePrompt.update({ where: { id: p.id }, data: { sortOrder: neighbour.sortOrder } }),
        prisma.gamePrompt.update({ where: { id: neighbour.id }, data: { sortOrder: p.sortOrder } }),
      ]);
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
