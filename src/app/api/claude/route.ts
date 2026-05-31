import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type ClaudeMessage = { role: string; content: string };

export async function POST(request: NextRequest) {
  const body = await request.json();
  const system = typeof body.system === "string" ? body.system : "";
  const messages = Array.isArray(body.messages) ? (body.messages as ClaudeMessage[]) : [];

  if (!system || messages.length === 0) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system,
      messages: messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content),
      })),
    });

    const content = response.content[0]?.type === "text" ? response.content[0].text : "";
    return NextResponse.json({ content: content.trim() });
  } catch {
    return NextResponse.json({ error: "Claude request failed" }, { status: 502 });
  }
}
