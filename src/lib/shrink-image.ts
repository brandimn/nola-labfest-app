"use client";

/** Photos from a phone are routinely several megabytes, which is far more than
 *  a logo or headshot needs. Scale it down in the browser rather than refusing
 *  the upload and sending someone off to find an image editor. */
export async function shrinkImage(dataUrl: string, maxSide = 512): Promise<string> {
  const img = document.createElement("img");
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = dataUrl;
  });

  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  if (scale === 1 && dataUrl.length < 900_000) return dataUrl;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // PNG first so a logo keeps a transparent background; JPEG only if still heavy.
  const png = canvas.toDataURL("image/png");
  if (png.length < 900_000) return png;
  return canvas.toDataURL("image/jpeg", 0.9);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
