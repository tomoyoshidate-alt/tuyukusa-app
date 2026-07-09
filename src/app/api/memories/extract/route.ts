import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  applyCurationDecisions,
  buildCurationPrompt,
  CURATE_SYSTEM,
  parseCurationDecisions,
} from "@/src/lib/memory/curate";
import {
  EXTRACT_SYSTEM,
  formatConversationForExtraction,
  parseExtractedMemories,
  type ConversationTurn,
} from "@/src/lib/memory/extract";
import {
  EXTRACT_RATE_LIMIT_MS,
  MAX_EXISTING_FOR_CURATION,
  type AiMemory,
} from "@/src/lib/memory/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type ExtractRequestBody = {
  userId?: string;
  moduleId?: string;
  messages?: ConversationTurn[];
  existingMemories?: AiMemory[];
  lastExtractAt?: string | null;
};

function isRateLimited(lastExtractAt: string | null | undefined): boolean {
  if (!lastExtractAt) return false;
  const elapsed = Date.now() - new Date(lastExtractAt).getTime();
  return elapsed < EXTRACT_RATE_LIMIT_MS;
}

function normalizeIncomingMemories(raw: unknown): AiMemory[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is AiMemory =>
      !!m &&
      typeof m === "object" &&
      typeof (m as AiMemory).id === "string" &&
      typeof (m as AiMemory).content === "string"
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ExtractRequestBody;

  if (isRateLimited(body.lastExtractAt)) {
    return NextResponse.json({ skipped: true, reason: "rate_limited" });
  }

  const turns = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  if (turns.length < 2) {
    return NextResponse.json({ skipped: true, reason: "insufficient_conversation" });
  }

  const userId = typeof body.userId === "string" ? body.userId : "anonymous";
  const moduleId = typeof body.moduleId === "string" ? body.moduleId : "date-general-v1";
  const existingMemories = normalizeIncomingMemories(body.existingMemories);

  try {
    const extractResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: EXTRACT_SYSTEM,
      messages: [
        {
          role: "user",
          content: formatConversationForExtraction(turns),
        },
      ],
    });

    const extractRaw =
      extractResponse.content[0].type === "text" ? extractResponse.content[0].text : "";
    const candidates = parseExtractedMemories(extractRaw);

    if (!candidates.length) {
      const lastExtractAt = new Date().toISOString();
      return NextResponse.json({
        memories: existingMemories,
        lastExtractAt,
        extracted: 0,
      });
    }

    const existingByCategory: Record<string, AiMemory[]> = {};
    for (const c of candidates) {
      if (!existingByCategory[c.category]) {
        existingByCategory[c.category] = existingMemories
          .filter(m => m.category === c.category)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .slice(0, MAX_EXISTING_FOR_CURATION);
      }
    }

    const curateResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: CURATE_SYSTEM,
      messages: [
        {
          role: "user",
          content: buildCurationPrompt(candidates, existingByCategory),
        },
      ],
    });

    const curateRaw =
      curateResponse.content[0].type === "text" ? curateResponse.content[0].text : "";
    const decisions = parseCurationDecisions(curateRaw, candidates.length);
    const now = new Date().toISOString();

    const memories = applyCurationDecisions(
      candidates,
      decisions,
      existingMemories,
      userId,
      moduleId,
      now
    );

    return NextResponse.json({
      memories,
      lastExtractAt: now,
      extracted: candidates.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Memory extraction failed" },
      { status: 502 }
    );
  }
}
