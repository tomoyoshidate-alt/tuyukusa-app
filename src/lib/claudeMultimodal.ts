import type Anthropic from "@anthropic-ai/sdk";

export type ApiImagePayload = { mediaType: string; data: string };

type TextBlock = Anthropic.Messages.TextBlockParam;
type ImageBlock = Anthropic.Messages.ImageBlockParam;

export function buildClaudeMessageContent(
  text: string,
  images?: ApiImagePayload[],
): string | Array<TextBlock | ImageBlock> {
  const trimmed = text.trim();
  const imageBlocks: ImageBlock[] = (images ?? [])
    .filter(img => img.mediaType && img.data)
    .map(img => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: img.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: img.data,
      },
    }));

  if (imageBlocks.length === 0) return trimmed;

  const blocks: Array<TextBlock | ImageBlock> = [
    ...imageBlocks,
    {
      type: "text",
      text: trimmed || "この画像について、わかりやすくアドバイスしてください。",
    },
  ];
  return blocks;
}
