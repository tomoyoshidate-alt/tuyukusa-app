'use client';

type Props = {
  onClose: () => void;
  onOpenSettings?: () => void;
};

export default function NotionManualPage({ onClose, onOpenSettings }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 220,
        background: "rgba(26,20,16,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 430,
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#f5f0e8",
          borderRadius: "20px 20px 0 0",
          padding: "20px 16px 28px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: "bold", color: "#3d3228" }}>Notion連携の設定方法</div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9a8b7a" }}>
            ×
          </button>
        </div>

        <div style={{ fontSize: 13, color: "#3d3228", lineHeight: 1.8 }}>
          <p style={{ marginBottom: 16 }}>
            つゆくさアプリはNotionと連携してタスク管理ができます。
            無料のNotionアカウントで設定できます。
          </p>

          <Section title="ステップ1：Notionアカウントを作成">
            <a href="https://notion.so" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              Notionに登録する
            </a>
          </Section>

          <Section title="ステップ2：APIキーを取得">
            <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              notion.so/my-integrations
            </a>
            <ol style={olStyle}>
              <li>「新規インテグレーション」をクリック</li>
              <li>名前に「つゆくさ」と入力</li>
              <li>「送信」をクリック</li>
              <li>表示された「シークレットキー」をコピー</li>
            </ol>
          </Section>

          <Section title="ステップ3：データベースを作成">
            <p style={{ margin: "8px 0" }}>
              設定画面の「自動セットアップ」ボタンを押すと、つゆくさ用データベースが自動作成されます。
            </p>
            <p style={{ margin: "8px 0", fontSize: 12, color: "#9a8b7a" }}>
              手動の場合は、Notionでページを作成し、インテグレーション「つゆくさ」にそのページへのアクセス権を付与してください。
            </p>
          </Section>

          <Section title="ステップ4：アプリに入力">
            <p style={{ margin: "8px 0" }}>
              設定画面の「Notion連携」にAPIキーを入力し、「自動セットアップ」をタップしてください。
              データベースIDの入力は不要です。
            </p>
            {onOpenSettings && (
              <button type="button" onClick={onOpenSettings} style={btnStyle}>
                設定画面を開く
              </button>
            )}
          </Section>

          <div style={{ marginTop: 20, padding: "12px 14px", background: "#e8f0e4", borderRadius: 10, fontSize: 12, color: "#4a6741" }}>
            わからない場合はAI相談でサポートします
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: "bold", color: "#8b5a2b", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  display: "inline-block",
  color: "#4a6741",
  fontWeight: "bold",
  marginBottom: 8,
};

const olStyle: React.CSSProperties = {
  paddingLeft: 20,
  margin: "8px 0",
  lineHeight: 1.8,
  fontSize: 12,
};

const btnStyle: React.CSSProperties = {
  marginTop: 8,
  padding: "10px 16px",
  borderRadius: 10,
  border: "none",
  background: "#1a1410",
  color: "#f5f0e8",
  fontSize: 13,
  fontWeight: "bold",
  cursor: "pointer",
};
