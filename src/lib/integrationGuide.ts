export type IntegrationId = "supabase" | "notion" | "googleCalendar" | "healthkit" | "sound";

export type IntegrationChoice = "setup" | "later";

export const INTEGRATION_ORDER: IntegrationId[] = [
  "supabase",
  "notion",
  "googleCalendar",
  "healthkit",
  "sound",
];

export const SUPABASE_WIZARD_STEPS = [
  {
    id: "visit",
    screenshotHint: "supabase.com のトップページ",
    descriptionKey: "integrationGuide.supabaseStep1",
  },
  {
    id: "signup",
    screenshotHint: "「Start your project」ボタン",
    descriptionKey: "integrationGuide.supabaseStep2",
  },
  {
    id: "project",
    screenshotHint: "New project 作成画面",
    descriptionKey: "integrationGuide.supabaseStep3",
  },
  {
    id: "api",
    screenshotHint: "Project Settings → API",
    descriptionKey: "integrationGuide.supabaseStep4",
  },
  {
    id: "sql",
    screenshotHint: "SQL Editor",
    descriptionKey: "integrationGuide.supabaseStep5",
  },
  {
    id: "app",
    screenshotHint: "つゆくさアプリ設定画面",
    descriptionKey: "integrationGuide.supabaseStep6",
  },
] as const;
