import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Serves one gallery photo as an actual image.
//
// They are stored as base64 data URLs, and the gallery used to put every one of
// them straight into the page. Three hundred photos at a few hundred kilobytes
// each is a page measured in tens of megabytes, which stops loading at all once
// a room starts posting. Served from here the page carries only links, the
// browser fetches them as it scrolls, and it caches them.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const photo = await prisma.galleryPhoto.findUnique({
    where: { id: params.id },
    select: { url: true },
  });
  if (!photo) return new NextResponse("Not found", { status: 404 });

  // Split by hand rather than with a regex: the payload is one very long line
  // and the dot-all flag is not available at this compile target.
  const comma = photo.url.indexOf(",");
  const header = comma === -1 ? "" : photo.url.slice(0, comma);
  const match = header.startsWith("data:") && header.endsWith(";base64")
    ? [header, header.slice(5, -7), photo.url.slice(comma + 1)]
    : null;
  // Anything already stored as a plain path is just handed back as a redirect.
  if (!match) return NextResponse.redirect(photo.url);

  const [, contentType, base64] = match;
  const bytes = Buffer.from(base64, "base64");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.length),
      // A photo never changes once posted, so it can be held for good.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
