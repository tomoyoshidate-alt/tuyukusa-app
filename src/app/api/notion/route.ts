import { NextRequest, NextResponse } from "next/server";
import {
  createNotionTask,
  resolveDatabaseIds,
  resolveNotionToken,
  setupNotionDatabase,
  syncAllNotionData,
  testAllNotionConnections,
  updateNotionPageStatus,
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

function dbIdsFromRequest(params: {
  taskDatabaseId?: string;
  scheduleDatabaseId?: string;
  communicationDatabaseId?: string;
  databaseId?: string;
}) {
  return resolveDatabaseIds({
    tasks: params.taskDatabaseId ?? params.databaseId,
    schedule: params.scheduleDatabaseId,
    communication: params.communicationDatabaseId,
  });
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const apiKey = sp.get("apiKey") ?? undefined;
  const token = resolveNotionToken(apiKey);
  if (!token) return unauthorized();

  const ids = dbIdsFromRequest({
    taskDatabaseId: sp.get("taskDatabaseId") ?? sp.get("databaseId") ?? undefined,
    scheduleDatabaseId: sp.get("scheduleDatabaseId") ?? undefined,
    communicationDatabaseId: sp.get("communicationDatabaseId") ?? undefined,
  });

  try {
    const data = await syncAllNotionData(token, ids);
    return NextResponse.json({
      ...data,
      databaseIds: ids,
    });
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
    taskDatabaseId?: string;
    scheduleDatabaseId?: string;
    communicationDatabaseId?: string;
    action?: "setup" | "create";
    task?: ParsedVoiceTask & { status?: NotionTaskStatus };
  };

  const token = resolveNotionToken(body.apiKey);
  if (!token) return unauthorized();

  const ids = dbIdsFromRequest(body);

  if (body.action === "setup") {
    try {
      const ok = await testAllNotionConnections(token, ids);
      if (ok) {
        return NextResponse.json({
          databaseIds: ids,
          taskDatabaseId: ids.tasks,
          created: false,
        });
      }
      const result = await setupNotionDatabase(token);
      return NextResponse.json({
        databaseIds: ids,
        taskDatabaseId: result.databaseId,
        created: result.created,
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "セットアップに失敗しました" },
        { status: 502 }
      );
    }
  }

  const task = body.task;
  if (!task?.text) {
    return NextResponse.json({ error: "タスク内容がありません" }, { status: 400 });
  }

  try {
    const created = await createNotionTask(token, ids.tasks, {
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
    taskDatabaseId?: string;
    scheduleDatabaseId?: string;
    communicationDatabaseId?: string;
    pageId?: string;
    status?: NotionTaskStatus;
    target?: "tasks" | "schedule" | "communication";
  };

  const token = resolveNotionToken(body.apiKey);
  if (!token) return unauthorized();
  if (!body.pageId) {
    return NextResponse.json({ error: "pageId が必要です" }, { status: 400 });
  }

  const ids = dbIdsFromRequest(body);
  const target = body.target ?? "tasks";
  const databaseId =
    target === "schedule" ? ids.schedule : target === "communication" ? ids.communication : ids.tasks;
  const status = body.status === "done" ? "done" : "pending";

  try {
    if (target === "tasks") {
      const updated = await updateNotionTaskStatus(token, databaseId, body.pageId, status);
      return NextResponse.json({ task: updated });
    }
    await updateNotionPageStatus(token, databaseId, body.pageId, status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "更新に失敗しました" },
      { status: 502 }
    );
  }
}
