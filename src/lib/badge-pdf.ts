import { PDFDocument, StandardFonts, rgb, PDFFont } from "pdf-lib";

export type BadgeInput = {
  name: string;
  company?: string | null;
  state?: string | null;
  badgeType?: string | null;
  qrPng?: Uint8Array | null;
};

type RGB = [number, number, number];

// Role tag colors, matching the on-screen badge TYPE_STYLE.
const TYPE_STYLE: Record<string, { label: string; bg: RGB; fg: RGB }> = {
  LAB:     { label: "Lab",        bg: [0.694, 0.243, 0.490], fg: [1, 1, 1] },
  VENDOR:  { label: "Vendor",     bg: [0.059, 0.090, 0.165], fg: [1, 1, 1] },
  SPEAKER: { label: "Speaker",    bg: [0.961, 0.647, 0.278], fg: [0.239, 0.118, 0.314] },
  NOWAK:   { label: "Nowak Team", bg: [0.055, 0.549, 0.294], fg: [1, 1, 1] },
  STUDENT: { label: "Student",    bg: [0.420, 0.447, 0.502], fg: [1, 1, 1] },
  VIP:     { label: "Crew",       bg: [0.925, 0.282, 0.600], fg: [1, 1, 1] },
};

// Fit `text` onto at most 2 lines within maxWidth, shrinking the font to fit.
function fitLines(text: string, font: PDFFont, maxWidth: number, startSize: number, minSize: number) {
  for (let size = startSize; size >= minSize; size -= 0.5) {
    if (font.widthOfTextAtSize(text, size) <= maxWidth) return { lines: [text], size };
    const words = text.split(/\s+/);
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" ");
      const b = words.slice(i).join(" ");
      if (font.widthOfTextAtSize(a, size) <= maxWidth && font.widthOfTextAtSize(b, size) <= maxWidth) {
        return { lines: [a, b], size };
      }
    }
  }
  return { lines: [text], size: minSize };
}

function truncateToWidth(text: string, font: PDFFont, maxWidth: number, size: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(t + "…", size) > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

/**
 * Six badges per US Letter page, square corners, a thin cut line around each.
 */
export async function buildBadgesPdf({ badges, bgBytes }: { badges: BadgeInput[]; bgBytes: Uint8Array }) {
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const isPng = bgBytes[0] === 0x89 && bgBytes[1] === 0x50;
  const bg = isPng ? await pdf.embedPng(bgBytes) : await pdf.embedJpg(bgBytes);
  const qrImages = await Promise.all(badges.map((b) => (b.qrPng ? pdf.embedPng(b.qrPng) : null)));

  const PAGE_W = 612, PAGE_H = 792;           // US Letter, points
  const margin = 25.2;                        // 0.35in
  const colGap = 14.4, rowGap = 14.4;         // 0.2in
  const cols = 2, rows = 3, perPage = cols * rows;
  const bw = (PAGE_W - 2 * margin - colGap * (cols - 1)) / cols; // ~273.6 (3.8in)
  const bh = (bw * 3) / 4;                                        // ~205.2 (2.85in)

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  badges.forEach((b, i) => {
    const slot = i % perPage;
    if (slot === 0 && i > 0) page = pdf.addPage([PAGE_W, PAGE_H]);
    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const bx = margin + col * (bw + colGap);
    const by = PAGE_H - margin - row * (bh + rowGap) - bh;

    page.drawImage(bg, { x: bx, y: by, width: bw, height: bh });

    page.drawRectangle({
      x: bx + 0.34 * bw, y: by + 0.42 * bh, width: 0.62 * bw, height: 0.40 * bh,
      color: rgb(0, 0, 0), opacity: 0.3,
    });

    const nameMaxW = 0.60 * bw;
    const { lines, size } = fitLines((b.name || "").trim(), helvB, nameMaxW, 21, 9);
    const lineH = size * 1.08;
    const blockH = lines.length * lineH;
    const nameCx = bx + 0.34 * bw + (0.62 * bw) / 2;
    let ty = by + 0.62 * bh + blockH / 2 - size;
    for (const ln of lines) {
      const w = helvB.widthOfTextAtSize(ln, size);
      page.drawText(ln, { x: nameCx - w / 2, y: ty, size, font: helvB, color: rgb(1, 1, 1) });
      ty -= lineH;
    }

    const style = b.badgeType ? TYPE_STYLE[b.badgeType] : null;
    if (style) {
      const ts = 7.5;
      const label = style.label.toUpperCase();
      const padX = 5, tagH = 14;
      const tw = helvB.widthOfTextAtSize(label, ts) + padX * 2;
      const tagX = bx + bw - 0.05 * bw - tw;
      const tagY = by + bh - 0.05 * bh - tagH;
      page.drawRectangle({ x: tagX, y: tagY, width: tw, height: tagH, color: rgb(style.bg[0], style.bg[1], style.bg[2]) });
      page.drawText(label, { x: tagX + padX, y: tagY + 4, size: ts, font: helvB, color: rgb(style.fg[0], style.fg[1], style.fg[2]) });
    }

    const qrSize = 0.30 * bh;
    const qrPad = 2.5;
    const qrX = bx + bw - 0.05 * bw - qrSize;
    const qrY = by + 0.085 * bh;
    page.drawRectangle({
      x: qrX - qrPad, y: qrY - qrPad, width: qrSize + 2 * qrPad, height: qrSize + 2 * qrPad, color: rgb(1, 1, 1),
    });
    const qr = qrImages[i];
    if (qr) page.drawImage(qr, { x: qrX, y: qrY, width: qrSize, height: qrSize });

    const textLeft = bx + 0.06 * bw;
    const textMaxW = qrX - qrPad - textLeft - 6;
    if (b.company) {
      const c = truncateToWidth(b.company, helvB, textMaxW, 12);
      page.drawText(c, { x: textLeft, y: by + 0.155 * bh, size: 12, font: helvB, color: rgb(1, 1, 1) });
    }
    if (b.state) {
      const s = truncateToWidth(b.state, helv, textMaxW, 9);
      page.drawText(s, { x: textLeft, y: by + 0.07 * bh, size: 9, font: helv, color: rgb(1, 1, 1) });
    }

    page.drawRectangle({ x: bx, y: by, width: bw, height: bh, borderColor: rgb(0.55, 0.58, 0.62), borderWidth: 0.75 });
  });

  return await pdf.save();
}
