export type SupabaseWizardLink = { label: string; url: string };

export type SupabaseWizardStep = {
  label: string;
  ai: string;
  links: SupabaseWizardLink[];
  quickQs: string[];
  qa: Record<string, string>;
  sql?: string;
  isInputStep?: boolean;
};

export const SUPABASE_SETUP_WIZARD_STEPS: SupabaseWizardStep[] = [
  {
    label: "はじめに",
    ai: "こんにちは！つゆくさアプリのクラウド同期を設定します。\n\nSupabase は無料で使えるデータベースサービスです。これを使うと、スマホとPCで同じデータを共有できるようになります。\n\n所要時間は約3〜5分です。一緒にゆっくり進めましょう 🌿",
    links: [],
    quickQs: ["Supabaseって何？", "無料で使えるの？", "難しそうで不安..."],
    qa: {
      "Supabaseって何？":
        "Supabaseは「オープンソースのFirebase代替」と呼ばれるサービスです。データベース・認証・ストレージなどが無料で使えます。つゆくさでは体調データや目標などの保存に使います。",
      "無料で使えるの？":
        "はい！無料プランで十分です。月50万リクエストまで無料なので、個人利用では全く問題ありません。クレジットカード不要で始められます。",
      "難しそうで不安...":
        "大丈夫です！このウィザードで一つひとつ案内するので、コードを書く必要はありません。コピペとクリックだけで完了します。",
    },
  },
  {
    label: "アカウント作成",
    ai: "まず Supabase のアカウントを作ります。\n\n① supabase.com を開く\n② Start your project をクリック\n③ GitHub アカウントでサインアップ（おすすめ）\n\nすでにアカウントがある方はそのままログインしてください。",
    links: [
      { label: "🔗 Supabase を開く", url: "https://supabase.com" },
      { label: "📖 スタートガイド", url: "https://supabase.com/docs/guides/getting-started" },
    ],
    quickQs: ["GitHubアカウントがない", "メールで登録したい", "もうアカウントある"],
    qa: {
      "GitHubアカウントがない":
        "メールアドレスでも登録できます。「Sign up with Email」を選んでメアドとパスワードを入力するだけです。確認メールが届くのでクリックして完了！",
      "メールで登録したい":
        "もちろんOKです。supabase.com の「Sign Up」でメールアドレスとパスワードを入力してください。登録後、確認メールが届きます。",
      "もうアカウントある": "素晴らしい！そのままログインして次のステップへ進んでください。",
    },
  },
  {
    label: "プロジェクト作成",
    ai: "ログインしたら新しいプロジェクトを作ります。\n\n① New Project をクリック\n② 名前を入力（例: tuyukusa）\n③ リージョンは Northeast Asia (Tokyo) を選択\n④ DBパスワードを設定してメモしておく\n⑤ Create new project をクリック\n\n作成に1〜2分かかります ☕",
    links: [{ label: "🔗 ダッシュボード", url: "https://app.supabase.com" }],
    quickQs: ["リージョンどこがいい？", "パスワードなんでもいい？", "作成完了した！"],
    qa: {
      "リージョンどこがいい？":
        "日本在住なら「Northeast Asia (Tokyo)」が最速です。データが物理的に近い場所にあるほど読み書きが速くなります。",
      "パスワードなんでもいい？":
        "セキュリティのため強いパスワードを設定してください。自動生成ボタンがおすすめです。必ずどこかにメモしておきましょう。",
      "作成完了した！": "お疲れさまです！プロジェクトが緑のステータスになったら準備完了です。次のステップへどうぞ！",
    },
  },
  {
    label: "テーブル作成",
    ai: "データを保存するテーブルを作ります。\n\n① 左メニューから SQL Editor を開く\n② 下の SQL をコピーして貼り付ける\n③ Run ボタンをクリック",
    sql: `create table if not exists tuyukusa_sync (
  sync_id text primary key,
  payload jsonb not null,
  updated_at timestamptz default now()
);

alter table tuyukusa_sync enable row level security;

create policy "Allow anon sync"
  on tuyukusa_sync for all
  using (true)
  with check (true);`,
    links: [{ label: "🔗 SQL Editor", url: "https://app.supabase.com" }],
    quickQs: ["SQLってなに？", "エラーが出た", "実行できた！"],
    qa: {
      "SQLってなに？":
        "データベースを操作するための言語です。今回はコピペするだけでOKです。このSQLでつゆくさ専用の保存場所を作っています。",
      "エラーが出た":
        "「already exists」というエラーなら問題ありません！テーブルがすでに存在しているだけです。それ以外のエラーはメッセージを教えてください。",
      "実行できた！": "完璧です！次はAPIキーを取得します。あと少しです！",
    },
  },
  {
    label: "キー入力",
    ai: "最後に接続情報をつゆくさに入力します。\n\nブラウザのURLバーに表示されている\n https://supabase.com/dashboard/project/【ここ】\n の【ここ】の部分をコピーして\n https://【ここ】.supabase.co\n と入力してください\n\n① ブラウザのURL「dashboard/project/」の後ろの文字列をコピー\n   例：iueassfgzpajfwmwrhis\n② Project URLに「https://（コピーした文字列）.supabase.co」と入力\n③ Project Settings → API Keys の「Publishable key」右のコピーボタンをクリック\n④ Supabase anon keyに貼り付け\n\n同期キーは好きな文字列でOKです（例: my-tuyukusa-2024）",
    links: [{ label: "🔗 API 設定", url: "https://app.supabase.com/project/_/settings/api" }],
    quickQs: ["Project URLどこ？", "Publishable keyってどれ？", "同期キーって何？"],
    qa: {
      "Project URLどこ？":
        "ブラウザのURLバーで dashboard/project/ の後ろにある文字列（例: iueassfgzpajfwmwrhis）をコピーし、https://（その文字列）.supabase.co と入力してください。",
      "Publishable keyってどれ？":
        "Settings → API Keys の「Publishable key」の右にあるコピーボタンを押してください。sb_publishable_ から始まる文字列です。",
      "同期キーって何？":
        "複数の端末で同じデータを見るための合言葉です。スマホとPCで同じキーを入力すれば、データが共有されます。自分で決めてOKです。",
    },
    isInputStep: true,
  },
];
