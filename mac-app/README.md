# つゆくさ Studio (Mac App)

院長向けの音源プリセット編集ツール。`~/tuyukusa-app/mac-app` に配置され、本体アプリと `public/audio`・`public/presets` を共有します。

## 開発

```bash
cd mac-app
npm run dev:mac   # http://localhost:3001
```

音源は `../public/audio/`、プリセット JSON は `../public/presets/` に保存されます（開発時は API が fs で直接書き込み）。

## Vercel デプロイ

1. Vercel で **新規プロジェクト** を作成（同一 GitHub リポジトリ）
2. **Root Directory** を `mac-app` に設定
3. 環境変数: `NEXT_PUBLIC_BASE_PATH=/mac`（任意）
4. 本体アプリの `public/presets/*.json` を git にコミットして共有

本番（Vercel）では fs 書き込み不可のため、保存時に JSON エクスポート → `public/presets/` にコミット → push してください。

## 構成

- 左: プリセット一覧
- 中央: BB / グラニュライザー編集
- 右: 3スロットミキサー + 波形表示
