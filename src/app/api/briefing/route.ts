import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { loadModuleForChat } from "@/src/lib/ai/loader";
import {
  BRIEFING_GENERATION_INSTRUCTION,
  buildBriefingDataContext,
  type BriefingClientContext,
} from "@/src/lib/briefing/context";
import { defaultEnvironmentProvider } from "@/src/lib/environment";
import { DEFAULT_CHOFU_LOCATION } from "@/src/lib/traits";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type BriefingRequestBody = {
  moduleId?: string;
  force?: boolean;
  dayKey?: string;
  cached?: {
    dayKey: string;
    moduleId: string;
    text: string;
    generatedAt: string;
  };
  context?: BriefingClientContext;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as BriefingRequestBody;
  const dayKey = typeof body.dayKey === "string" ? body.dayKey : todayKey();
  const moduleId = body.moduleId ?? "date-general-v1";
  const force = body.force === true;

  if (
    !force &&
    body.cached &&
    body.cached.dayKey === dayKey &&
    body.cached.moduleId === moduleId &&
    body.cached.text?.trim()
  ) {
    return NextResponse.json({
      text: body.cached.text.trim(),
      dayKey,
      moduleId,
      generatedAt: body.cached.generatedAt,
      cached: true,
    });
  }

  const ctx = body.context;
  const location = ctx?.location ?? DEFAULT_CHOFU_LOCATION;
  const lat = location.lat;
  const lon = location.lon;

  let env;
  try {
    const weather = await defaultEnvironmentProvider.getWeather(lat, lon);
    const pollenLevel = await defaultEnvironmentProvider.getPollenLevel(lat, lon, new Date(), {
      windSpeed: weather.windSpeed,
      precipitation: weather.precipitation,
    });
    env = { weather, pollenLevel };
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Environment data fetch failed" },
      { status: 502 }
    );
  }

  const { systemPrompt } = loadModuleForChat(moduleId, "ja");
  const dataContext = buildBriefingDataContext(
    moduleId,
    ctx ?? { location: DEFAULT_CHOFU_LOCATION },
    env
  );

  const system = `${systemPrompt}

【朝のブリーフィング生成モード】
${BRIEFING_GENERATION_INSTRUCTION}
スケジュールJSONやREFLECT_SCHEDULEは出力しないでください。`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system,
      messages: [
        {
          role: "user",
          content: `以下のデータをもとに、今日の朝ブリーフィングを生成してください。\n\n${dataContext}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    if (!text) {
      return NextResponse.json({ error: "Empty briefing generated" }, { status: 502 });
    }

    const generatedAt = new Date().toISOString();
    return NextResponse.json({
      text,
      dayKey,
      moduleId,
      generatedAt,
      cached: false,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Briefing generation failed" },
      { status: 502 }
    );
  }
}
