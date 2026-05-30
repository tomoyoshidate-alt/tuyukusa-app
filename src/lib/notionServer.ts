import {
  NOTION_DATABASE_IDS,
  formatNotionId,
  mapNotionTypeLabel,
  parseNotionTypeLabel,
  parseScheduleEventType,
  type NotionMemo,
  type NotionScheduleEvent,
  type NotionTask,
  type NotionTaskStatus,
  type NotionTaskType,
  type ParsedVoiceTask,
  type NotionSyncData,
} from "@/src/lib/notion";

const NOTION_VERSION = "2022-06-28";
const DATABASE_TITLE = "つゆくさタスク";

type DbSchema = {
  titleProp: string;
  statusProp?: string;
  statusPropType?: "select" | "status";
  typeProp?: string;
  categoryProp?: string;
  dateProp?: string;
};

type NotionProperty = {
  id: string;
  type: string;
  name?: string;
};

export type NotionDatabaseIds = {
  tasks: string;
  schedule: string;
  communication: string;
};

function notionHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

export function resolveNotionToken(clientKey?: string): string {
  return clientKey?.trim() || process.env.NOTION_API_KEY?.trim() || "";
}

export function resolveDatabaseIds(settings?: Partial<NotionDatabaseIds>): NotionDatabaseIds {
  return {
    tasks: formatNotionId(
      settings?.tasks?.trim() ||
        process.env.NOTION_TASK_DATABASE_ID?.trim() ||
        NOTION_DATABASE_IDS.tasks
    ),
    schedule: formatNotionId(
      settings?.schedule?.trim() ||
        process.env.NOTION_SCHEDULE_DATABASE_ID?.trim() ||
        NOTION_DATABASE_IDS.schedule
    ),
    communication: formatNotionId(
      settings?.communication?.trim() ||
        process.env.NOTION_COMMUNICATION_DATABASE_ID?.trim() ||
        NOTION_DATABASE_IDS.communication
    ),
  };
}

/** @deprecated use resolveDatabaseIds().tasks */
export function resolveDatabaseId(clientId?: string): string {
  return resolveDatabaseIds({ tasks: clientId }).tasks;
}

async function notionFetch(token: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: { ...notionHeaders(token), ...(init?.headers ?? {}) },
  });
}

function pickProp(
  properties: Record<string, NotionProperty>,
  names: string[],
  type: string
): string | undefined {
  for (const name of names) {
    if (properties[name]?.type === type) return name;
  }
  return Object.entries(properties).find(([, p]) => p.type === type)?.[0];
}

export async function detectDatabaseSchema(token: string, databaseId: string): Promise<DbSchema> {
  const res = await notionFetch(token, `/databases/${formatNotionId(databaseId)}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`データベース取得失敗: ${err}`);
  }
  const data = (await res.json()) as { properties: Record<string, NotionProperty> };
  const props = data.properties ?? {};
  const titleProp = pickProp(props, ["名前", "Name", "タイトル", "タスク", "件名"], "title");
  if (!titleProp) throw new Error("タイトルプロパティが見つかりません");

  const statusSelect = pickProp(props, ["ステータス", "Status", "状態"], "select");
  const statusNative = pickProp(props, ["ステータス", "Status", "状態"], "status");

  return {
    titleProp,
    statusProp: statusSelect ?? statusNative,
    statusPropType: statusSelect ? "select" : statusNative ? "status" : undefined,
    typeProp: pickProp(props, ["種別", "Type", "タイプ", "カテゴリ", "Category"], "select"),
    categoryProp: pickProp(props, ["カテゴリ", "Category", "分類"], "select"),
    dateProp: pickProp(props, ["期限", "Due", "日付", "Date", "開始", "開始日時"], "date"),
  };
}

function readTitle(props: Record<string, unknown>, key: string): string {
  const p = props[key] as { title?: { plain_text?: string }[] } | undefined;
  return p?.title?.map(t => t.plain_text ?? "").join("") ?? "";
}

function readSelect(props: Record<string, unknown>, key?: string): string | undefined {
  if (!key) return undefined;
  const p = props[key] as { select?: { name?: string } | null } | undefined;
  return p?.select?.name;
}

function readStatus(props: Record<string, unknown>, key?: string, type?: DbSchema["statusPropType"]): string | undefined {
  if (!key) return undefined;
  if (type === "status") {
    const p = props[key] as { status?: { name?: string } | null } | undefined;
    return p?.status?.name;
  }
  return readSelect(props, key);
}

function isDoneStatus(label: string | undefined): boolean {
  if (!label) return false;
  return /完了|done|済|closed|archived/i.test(label);
}

function readDate(props: Record<string, unknown>, key?: string): { date?: string; time?: string } {
  if (!key) return {};
  const p = props[key] as { date?: { start?: string } | null } | undefined;
  const start = p?.date?.start;
  if (!start) return {};
  if (start.includes("T")) {
    const [date, timePart] = start.split("T");
    return { date, time: timePart?.slice(0, 5) };
  }
  return { date: start };
}

async function queryDatabase(token: string, databaseId: string): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = [];
  let cursor: string | undefined;
  do {
    const body: Record<string, unknown> = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await notionFetch(token, `/databases/${formatNotionId(databaseId)}/query`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`クエリ失敗: ${err}`);
    }
    const data = (await res.json()) as {
      results: Record<string, unknown>[];
      has_more: boolean;
      next_cursor: string | null;
    };
    results.push(...data.results);
    cursor = data.has_more ? data.next_cursor ?? undefined : undefined;
  } while (cursor);
  return results;
}

function pageToTask(page: Record<string, unknown>, schema: DbSchema): NotionTask | null {
  const props = page.properties as Record<string, unknown>;
  const text = readTitle(props, schema.titleProp);
  if (!text) return null;
  const statusLabel = readStatus(props, schema.statusProp, schema.statusPropType);
  const typeLabel = readSelect(props, schema.typeProp);
  const category = readSelect(props, schema.categoryProp) ?? readSelect(props, schema.typeProp) ?? "その他";
  const { date, time } = readDate(props, schema.dateProp);
  return {
    id: page.id as string,
    text,
    type: parseNotionTypeLabel(typeLabel),
    category,
    deadline: date,
    time,
    status: isDoneStatus(statusLabel) ? "done" : "pending",
    notionUrl: page.url as string | undefined,
  };
}

function pageToScheduleEvent(page: Record<string, unknown>, schema: DbSchema): NotionScheduleEvent | null {
  const props = page.properties as Record<string, unknown>;
  const title = readTitle(props, schema.titleProp);
  if (!title) return null;
  const statusLabel = readStatus(props, schema.statusProp, schema.statusPropType);
  const typeLabel = readSelect(props, schema.typeProp) ?? readSelect(props, schema.categoryProp);
  const { date, time } = readDate(props, schema.dateProp);
  return {
    id: page.id as string,
    title,
    eventType: parseScheduleEventType(typeLabel),
    date,
    time,
    status: isDoneStatus(statusLabel) ? "done" : "pending",
    notionUrl: page.url as string | undefined,
  };
}

function pageToMemo(page: Record<string, unknown>, schema: DbSchema): NotionMemo | null {
  const props = page.properties as Record<string, unknown>;
  const title = readTitle(props, schema.titleProp);
  if (!title) return null;
  const statusLabel = readStatus(props, schema.statusProp, schema.statusPropType);
  return {
    id: page.id as string,
    title,
    status: isDoneStatus(statusLabel) ? "done" : "pending",
    updatedAt: (page.last_edited_time as string | undefined) ?? undefined,
    notionUrl: page.url as string | undefined,
  };
}

export async function fetchNotionTasks(token: string, databaseId: string): Promise<NotionTask[]> {
  const schema = await detectDatabaseSchema(token, databaseId);
  const pages = await queryDatabase(token, databaseId);
  return pages.map(p => pageToTask(p, schema)).filter(Boolean) as NotionTask[];
}

export async function fetchNotionScheduleEvents(token: string, databaseId: string): Promise<NotionScheduleEvent[]> {
  const schema = await detectDatabaseSchema(token, databaseId);
  const pages = await queryDatabase(token, databaseId);
  return pages.map(p => pageToScheduleEvent(p, schema)).filter(Boolean) as NotionScheduleEvent[];
}

export async function fetchNotionMemos(token: string, databaseId: string): Promise<NotionMemo[]> {
  const schema = await detectDatabaseSchema(token, databaseId);
  const pages = await queryDatabase(token, databaseId);
  return pages.map(p => pageToMemo(p, schema)).filter(Boolean) as NotionMemo[];
}

export async function syncAllNotionData(token: string, ids: NotionDatabaseIds): Promise<NotionSyncData> {
  const [tasks, scheduleEvents, memos] = await Promise.all([
    fetchNotionTasks(token, ids.tasks),
    fetchNotionScheduleEvents(token, ids.schedule),
    fetchNotionMemos(token, ids.communication),
  ]);
  return { tasks, scheduleEvents, memos, syncedAt: Date.now() };
}

function buildStatusProperty(schema: DbSchema, status: NotionTaskStatus): Record<string, unknown> | null {
  if (!schema.statusProp) return null;
  const doneNames = ["完了", "Done", "済"];
  const pendingNames = ["未着手", "未完了", "進行中", "Not started", "To Do"];
  const name = status === "done" ? doneNames[0] : pendingNames[0];
  if (schema.statusPropType === "status") {
    return { [schema.statusProp]: { status: { name } } };
  }
  return { [schema.statusProp]: { select: { name } } };
}

export async function updateNotionPageStatus(
  token: string,
  databaseId: string,
  pageId: string,
  status: NotionTaskStatus
): Promise<void> {
  const schema = await detectDatabaseSchema(token, databaseId);
  const statusProp = buildStatusProperty(schema, status);
  if (!statusProp) throw new Error("ステータスプロパティがありません");

  const res = await notionFetch(token, `/pages/${formatNotionId(pageId)}`, {
    method: "PATCH",
    body: JSON.stringify({ properties: statusProp }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ステータス更新失敗: ${err}`);
  }
}

export async function updateNotionTaskStatus(
  token: string,
  databaseId: string,
  pageId: string,
  status: NotionTaskStatus
): Promise<NotionTask> {
  await updateNotionPageStatus(token, databaseId, pageId, status);
  const schema = await detectDatabaseSchema(token, databaseId);
  const res = await notionFetch(token, `/pages/${formatNotionId(pageId)}`);
  if (!res.ok) throw new Error("更新後の取得に失敗しました");
  const page = (await res.json()) as Record<string, unknown>;
  const updated = pageToTask(page, schema);
  if (!updated) throw new Error("更新したタスクの解析に失敗しました");
  return updated;
}

export async function createNotionTask(
  token: string,
  databaseId: string,
  task: ParsedVoiceTask | {
    text: string;
    type: NotionTaskType;
    category: string;
    deadline?: string | null;
    time?: string | null;
    status?: NotionTaskStatus;
  }
): Promise<NotionTask> {
  const schema = await detectDatabaseSchema(token, databaseId);
  const properties: Record<string, unknown> = {
    [schema.titleProp]: {
      title: [{ text: { content: task.text.slice(0, 2000) } }],
    },
  };

  const statusProp = buildStatusProperty(schema, "status" in task && task.status === "done" ? "done" : "pending");
  if (statusProp) Object.assign(properties, statusProp);
  if (schema.typeProp) {
    properties[schema.typeProp] = { select: { name: mapNotionTypeLabel(task.type) } };
  }
  if (schema.categoryProp && task.category) {
    properties[schema.categoryProp] = { select: { name: task.category } };
  }
  if (schema.dateProp && task.deadline) {
    const start = task.time ? `${task.deadline}T${task.time}:00` : task.deadline;
    properties[schema.dateProp] = { date: { start } };
  }

  const res = await notionFetch(token, "/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: formatNotionId(databaseId) },
      properties,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`タスク追加失敗: ${err}`);
  }
  const page = (await res.json()) as Record<string, unknown>;
  const created = pageToTask(page, schema);
  if (!created) throw new Error("作成したタスクの解析に失敗しました");
  return created;
}

export async function testNotionConnection(token: string, databaseId: string): Promise<{ ok: boolean; title?: string }> {
  const res = await notionFetch(token, `/databases/${formatNotionId(databaseId)}`);
  if (!res.ok) return { ok: false };
  const data = (await res.json()) as { title?: { plain_text?: string }[] };
  const title = data.title?.map(t => t.plain_text).join("") ?? DATABASE_TITLE;
  return { ok: true, title };
}

export async function testAllNotionConnections(token: string, ids: NotionDatabaseIds): Promise<boolean> {
  const results = await Promise.all([
    testNotionConnection(token, ids.tasks),
    testNotionConnection(token, ids.schedule),
    testNotionConnection(token, ids.communication),
  ]);
  return results.every(r => r.ok);
}

async function findExistingDatabase(token: string): Promise<string | null> {
  const res = await notionFetch(token, "/search", {
    method: "POST",
    body: JSON.stringify({
      query: DATABASE_TITLE,
      filter: { value: "database", property: "object" },
      page_size: 20,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { results: { id: string; title?: { plain_text?: string }[] }[] };
  const hit = data.results.find(r => r.title?.some(t => t.plain_text?.includes("つゆくさ")));
  return hit?.id ?? data.results[0]?.id ?? null;
}

async function findParentPage(token: string): Promise<string | null> {
  const res = await notionFetch(token, "/search", {
    method: "POST",
    body: JSON.stringify({
      filter: { value: "page", property: "object" },
      page_size: 1,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { results: { id: string }[] };
  return data.results[0]?.id ?? null;
}

export async function setupNotionDatabase(token: string): Promise<{ databaseId: string; created: boolean }> {
  const ids = resolveDatabaseIds();
  const existingOk = await testAllNotionConnections(token, ids);
  if (existingOk) return { databaseId: ids.tasks, created: false };

  const existing = await findExistingDatabase(token);
  if (existing) {
    const test = await testNotionConnection(token, existing);
    if (test.ok) return { databaseId: existing, created: false };
  }

  const parentPageId = await findParentPage(token);
  if (!parentPageId) {
    throw new Error(
      "ページが見つかりません。Notionでページを1つ作成し、インテグレーションにアクセス権を付与してください。"
    );
  }

  const res = await notionFetch(token, "/databases", {
    method: "POST",
    body: JSON.stringify({
      parent: { type: "page_id", page_id: parentPageId },
      title: [{ type: "text", text: { content: DATABASE_TITLE } }],
      properties: {
        名前: { title: {} },
        ステータス: {
          select: {
            options: [
              { name: "未着手", color: "gray" },
              { name: "完了", color: "green" },
            ],
          },
        },
        種別: {
          select: {
            options: [
              { name: "今日", color: "blue" },
              { name: "期限付き", color: "orange" },
              { name: "習慣", color: "purple" },
            ],
          },
        },
        カテゴリ: {
          select: {
            options: [
              { name: "仕事", color: "default" },
              { name: "健康", color: "green" },
              { name: "生活", color: "yellow" },
              { name: "その他", color: "gray" },
            ],
          },
        },
        期限: { date: {} },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`データベース作成失敗: ${err}`);
  }

  const data = (await res.json()) as { id: string };
  return { databaseId: data.id, created: true };
}

export function parseVoiceTaskJson(raw: string): ParsedVoiceTask | null {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<ParsedVoiceTask>;
    if (!parsed.text || typeof parsed.text !== "string") return null;
    const type =
      parsed.type === "habit" || parsed.type === "deadline" || parsed.type === "today"
        ? parsed.type
        : "today";
    return {
      text: parsed.text.trim(),
      type,
      category: parsed.category?.trim() || "その他",
      deadline: parsed.deadline ?? null,
      time: parsed.time ?? null,
      summary: parsed.summary?.trim() || parsed.text.trim(),
    };
  } catch {
    return null;
  }
}
