import type { SupabaseClient } from "@supabase/supabase-js";

export const UPLOAD_PREFIX = "uploads";
export const DEFAULT_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "text/plain": "txt",
};

export type FileUploadValidation = {
  maxBytes?: number;
  allowedExtensions?: readonly string[] | Set<string>;
};

export type StorageUploadResult = {
  storageKey: string;
  displayName: string;
  publicUrl: string;
};

/** 拡張子を小文字で返す。取れない場合は bin。 */
export function extractFileExtension(fileName: string, mimeType?: string): string {
  const base = fileName.replace(/^.*[/\\]/, "").trim();
  const dot = base.lastIndexOf(".");
  if (dot > 0 && dot < base.length - 1) {
    const ext = base
      .slice(dot + 1)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (ext) return ext;
  }
  if (mimeType) {
    const fromMime = MIME_TO_EXT[mimeType.toLowerCase()];
    if (fromMime) return fromMime;
  }
  return "bin";
}

/** Supabase Storage 用の安全なオブジェクトキー（uploads/uuid.ext） */
export function buildSanitizedStorageKey(ext: string, prefix = UPLOAD_PREFIX): string {
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  return `${prefix}/${crypto.randomUUID()}.${safeExt}`;
}

export function validateFileForUpload(file: File, validation?: FileUploadValidation): void {
  const maxBytes = validation?.maxBytes ?? DEFAULT_UPLOAD_MAX_BYTES;
  if (file.size > maxBytes) {
    throw new Error(`ファイルサイズは ${Math.round(maxBytes / 1024 / 1024)}MB 以下にしてください`);
  }
  if (!validation?.allowedExtensions) return;

  const ext = extractFileExtension(file.name, file.type);
  const allowed =
    validation.allowedExtensions instanceof Set
      ? validation.allowedExtensions
      : new Set(validation.allowedExtensions);
  if (!allowed.has(ext)) {
    throw new Error(`許可されていないファイル形式です（.${ext}）`);
  }
}

export async function uploadFileToStorage(
  client: SupabaseClient,
  bucket: string,
  file: File,
  validation?: FileUploadValidation
): Promise<StorageUploadResult> {
  validateFileForUpload(file, validation);

  const ext = extractFileExtension(file.name, file.type);
  const storageKey = buildSanitizedStorageKey(ext);
  const contentType = file.type || "application/octet-stream";

  const { error } = await client.storage.from(bucket).upload(storageKey, file, {
    contentType,
    upsert: false,
    metadata: { displayName: file.name },
  });
  if (error) throw new Error(error.message);

  const { data } = client.storage.from(bucket).getPublicUrl(storageKey);
  return {
    storageKey,
    displayName: file.name,
    publicUrl: data.publicUrl,
  };
}

export function displayNameFromStorageMetadata(metadata: unknown, fallback: string): string {
  if (metadata && typeof metadata === "object" && "displayName" in metadata) {
    const name = (metadata as { displayName?: unknown }).displayName;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return fallback;
}
