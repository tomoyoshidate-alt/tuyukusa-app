import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { buildClaudeMessageContent, type ApiImagePayload } from "@/src/lib/claudeMultimodal";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type ClaudeMessage = { role: string; content: string };

function normalizeImages(raw: unknown): ApiImagePayload[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is ApiImagePayload =>
        !!item &&
        typeof item === "object" &&
        typeof (item as ApiImagePayload).mediaType === "string" &&
        typeof (item as ApiImagePayload).data === "string",
    )
    .map(item => ({ mediaType: item.mediaType, data: item.data }));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const system = typeof body.system === "string" ? body.system : "";
  const messages = Array.isArray(body.messages) ? (body.messages as ClaudeMessage[]) : [];
  const images = normalizeImages(body.images);

  if (!system || messages.length === 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const anthropicMessages = messages.map((m, index) => {
      const isLastUser = m.role !== "assistant" && index === messages.length - 1;
      const content =
        isLastUser && images.length > 0
          ? buildClaudeMessageContent(String(m.content), images)
          : String(m.content);
      return {
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content,
      };
    });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system,
      messages: anthropicMessages,
    });

    const content = response.content[0]?.type === "text" ? response.content[0].text : "";
    return NextResponse.json({ content: content.trim() });
  } catch {
    return NextResponse.json({ error: "Claude request failed" }, { status: 502 });
  }
}
