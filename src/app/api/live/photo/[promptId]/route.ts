import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Caption photos are stored as data URLs. Served once from here and cached hard,
// so they never ride along with the polled state.
export async function GET(_req: Request, { params }: { params: { promptId: string } }) {
  const prompt = await prisma.gamePrompt.findUnique({
    where: { id: params.promptId },
    select: { imageUrl: true },
  });
  if (!prompt?.imageUrl) return new NextResponse("Not found", { status: 404 });

  const match = /^data:([^;]+);base64,([\s\S]*)$/.exec(prompt.imageUrl);
  if (!match) return NextResponse.redirect(prompt.imageUrl);

  return new NextResponse(new Uint8Array(Buffer.from(match[2], "base64")), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
