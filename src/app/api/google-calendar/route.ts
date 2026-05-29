import { NextRequest, NextResponse } from "next/server";
import {
  buildGoogleCalendarIcsUrl,
  detectCalendarDayMode,
  filterEventsForDay,
  parseIcsEvents,
} from "@/src/lib/googleCalendar";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim();
  const day = request.nextUrl.searchParams.get("day")?.trim() ?? new Date().toISOString().slice(0, 10);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "有効なメールアドレスを入力してください" }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return NextResponse.json({ error: "日付形式が不正です" }, { status: 400 });
  }

  try {
    const icsUrl = buildGoogleCalendarIcsUrl(email);
    const res = await fetch(icsUrl, {
      headers: { "User-Agent": "tuyukusa-app/1.0" },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            "カレンダーを取得できませんでした。Googleカレンダーを「一般公開」に設定しているか確認してください。",
        },
        { status: 502 }
      );
    }

    const ics = await res.text();
    if (!ics.includes("BEGIN:VCALENDAR")) {
      return NextResponse.json({ error: "カレンダーデータの形式が不正です" }, { status: 502 });
    }

    const allEvents = parseIcsEvents(ics);
    const events = filterEventsForDay(allEvents, day);
    const dayMode = detectCalendarDayMode(events);

    return NextResponse.json({ events, dayMode, day });
  } catch {
    return NextResponse.json({ error: "カレンダーの取得中にエラーが発生しました" }, { status: 500 });
  }
}
