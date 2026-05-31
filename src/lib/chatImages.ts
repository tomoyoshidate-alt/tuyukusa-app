export type ChatImagePayload = {
  dataUrl: string;
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  base64: string;
};

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set<ChatImagePayload["mediaType"]>([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export function parseDataUrl(dataUrl: string): ChatImagePayload | null {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/);
  if (!match) return null;
  const mediaType = match[1] as ChatImagePayload["mediaType"];
  const base64 = match[2];
  if (!ALLOWED_TYPES.has(mediaType) || !base64) return null;
  return { dataUrl, mediaType, base64 };
}

export function fileToChatImage(file: File): Promise<ChatImagePayload> {
  return new Promise((resolve, reject) => {
    if (!ALLOWED_TYPES.has(file.type as ChatImagePayload["mediaType"])) {
      reject(new Error("対応していない画像形式です（JPEG / PNG / GIF / WebP）"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error("画像は4MB以下にしてください"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) {
        reject(new Error("画像の読み込みに失敗しました"));
        return;
      }
      resolve(parsed);
    };
    reader.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    reader.readAsDataURL(file);
  });
}

export async function readClipboardImages(items: DataTransferItemList): Promise<ChatImagePayload[]> {
  const images: ChatImagePayload[] = [];
  for (const item of Array.from(items)) {
    if (!item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (!file) continue;
    try {
      images.push(await fileToChatImage(file));
    } catch {
      /* skip invalid */
    }
  }
  return images;
}

export function toApiImagePayload(image: ChatImagePayload): { mediaType: string; data: string } {
  return { mediaType: image.mediaType, data: image.base64 };
}
