import { NextRequest, NextResponse } from "next/server";
import {
  createNotionTask,
  fetchNotionTasks,
  resolveDatabaseId,
  resolveNotionToken,
  setupNotionDatabase,
  testNotionConnection,
  updateNotionTaskStatus,
} from "@/src/lib/notionServer";
import type { NotionTaskStatus, NotionTaskType, ParsedVoiceTask } from "@/src/lib/notion";

export const dynamic = "force-dynamic";

function unauthorized(): NextResponse {
  return NextResponse.json(
    { error: "Notion APIキーが設定されていません。設定画面で連携してください。" },
    { status: 401 }
  );
}

export async function GET(request: NextRequest) {
  const apiKey = request.nextUrl.searchParams.get("apiKey") ?? undefined;
  const databaseIdParam = request.nextUrl.searchParams.get("databaseId") ?? undefined;
  const token = resolveNotionToken(apiKey);
  if (!token) return unauthorized();

  const databaseId = resolveDatabaseId(databaseIdParam);
  try {
    const tasks = await fetchNotionTasks(token, databaseId);
    return NextResponse.json({ tasks, databaseId, syncedAt: Date.now() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Notion同期に失敗しました" },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    apiKey?: string;
    databaseId?: string;
    action?: "setup" | "create";
    task?: ParsedVoiceTask & { status?: NotionTaskStatus };
  };

  const token = resolveNotionToken(body.apiKey);
  if (!token) return unauthorized();

  if (body.action === "setup") {
    try {
      const envDb = process.env.NOTION_DATABASE_ID?.trim();
      if (envDb && !body.apiKey?.trim()) {
        const test = await testNotionConnection(token, envDb);
        if (test.ok) {
          return NextResponse.json({
            databaseId: resolveDatabaseId(envDb),
            created: false,
            title: test.title,
          });
        }
      }
      const result = await setupNotionDatabase(token);
      const test = await testNotionConnection(token, result.databaseId);
      return NextResponse.json({
        databaseId: result.databaseId,
        created: result.created,
        title: test.title,
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "セットアップに失敗しました" },
        { status: 502 }
      );
    }
  }

  const databaseId = resolveDatabaseId(body.databaseId);
  const task = body.task;
  if (!task?.text) {
    return NextResponse.json({ error: "タスク内容がありません" }, { status: 400 });
  }

  try {
    const created = await createNotionTask(token, databaseId, {
      text: task.text,
      type: task.type as NotionTaskType,
      category: task.category,
      deadline: task.deadline,
      time: task.time,
      status: task.status ?? "pending",
    });
    return NextResponse.json({ task: created });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "タスク追加に失敗しました" },
      { status: 502 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as {
    apiKey?: string;
    databaseId?: string;
    pageId?: string;
    status?: NotionTaskStatus;
  };

  const token = resolveNotionToken(body.apiKey);
  if (!token) return unauthorized();
  if (!body.pageId) {
    return NextResponse.json({ error: "pageId が必要です" }, { status: 400 });
  }

  const databaseId = resolveDatabaseId(body.databaseId);
  const status = body.status === "done" ? "done" : "pending";

  try {
    const updated = await updateNotionTaskStatus(token, databaseId, body.pageId, status);
    return NextResponse.json({ task: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "更新に失敗しました" },
      { status: 502 }
    );
  }
}
