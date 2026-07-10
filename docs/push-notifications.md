# プッシュ通知（Web Push / VAPID）実装・有効化ランブック

> 方針: **無料・電池に優しい・厳密でなくてよい**。
> - Web Push は VAPID で完全無料。OS標準のプッシュ経路（iPhone=APNs / Android=FCM）に
>   相乗りするため端末の電池消費が最も軽い。
> - 送信は **Vercel の無料 Cron（1日1回・朝）** のみ。AIを呼ばず固定メッセージを
>   日替わりで送るので API 費用もゼロ。厳密な時刻保証はしない（best-effort）。
> - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` 未設定の間は UI にトグルが出ず購読も送信もされないため、
>   既存動作に一切影響しない。

## 構成ファイル
- `public/sw.js` … `push` リスナー追記（既存アラーム処理には非干渉）
- `src/lib/push/subscribe.ts` … クライアント購読ヘルパー（env未設定なら no-op）
- `src/components/PushNotificationToggle.tsx` … 設定画面トグル（未設定なら非表示）
- `src/app/settings/page.tsx` … トグル差し込み
- `src/lib/push/server.ts` … 送信の共有ロジック（env未設定なら configured:false）
- `src/app/api/push/subscribe/route.ts` … 購読保存（未設定なら 501）
- `src/app/api/push/cron/route.ts` … 無料Cronの朝リマインド（GET・固定文・日替わり）
- `src/app/api/push/send/route.ts` … 手動/テスト送信（x-push-secret 保護）
- `supabase/push_subscriptions.sql` … 購読テーブル（暫定 anon RLS。要本番硬化）
- `vercel.json` … `crons`（`0 22 * * *` = JST 07:00 に1日1回）
- `package.json` … `web-push` / `@types/web-push`

## 有効化手順（無料）
1. `npm install`
2. VAPID 鍵生成: `npx web-push generate-vapid-keys`
3. Supabase(Tsuyukusa AD) の SQL Editor で `supabase/push_subscriptions.sql` を実行
4. Vercel の環境変数（Production/Preview）に設定:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`（公開鍵）
   - `VAPID_PRIVATE_KEY`（秘密鍵）
   - `VAPID_SUBJECT`（例: `mailto:tsuyukusaiin@gmail.com`）
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`（送信時に購読を読む用）
   - `CRON_SECRET`（任意の長い文字列。Vercleが Cron 呼び出し時に Bearer で自動付与）
   - `PUSH_SEND_SECRET`（手動送信APIを使う場合のみ）
5. `npm run build` → デプロイ
6. 設定画面に「通知を有効にする」が出る。iPhone はホーム画面に追加（PWA, iOS16.4+）してから許可。

## 動作
- 毎朝 JST 7:00 頃、Vercel Cron が `/api/push/cron` を1回叩き、購読中の端末へ
  日替わりの朝メッセージ（塩湯・早寝・朝の光など）を送る。厳密な時刻保証はしない。
- 費用: Web Push 無料 / Vercel Hobby の Cron は1日1回まで無料枠内 / AI未使用でトークン費ゼロ。

## 手動テスト（任意）
```bash
curl -X POST https://tsuyukusa-star.vercel.app/api/push/send \
  -H "Content-Type: application/json" \
  -H "x-push-secret: $PUSH_SEND_SECRET" \
  -d '{"title":"つゆくさ","body":"就寝前に塩湯を一杯（自然塩3g）","url":"/"}'
```

## 注意
- Vercel Hobby の Cron は「1日1回」まで。就寝前リマインドも足したい場合は Pro が必要になるため、
  当面は朝1回のみ。就寝前の通知が必要なら、アプリ利用時にSWのローカルアラームで代替する案もある。
- `push_subscriptions` の RLS は暫定 anon。本番では client_id 偽装対策・Auth 化を行う。
- 送信本文の飲み物養生表現は必ず「塩湯」（白湯ではない）。
