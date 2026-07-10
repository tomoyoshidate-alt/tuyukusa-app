# 家族アカウント（Layer D つながり層）実装メモ

> 状態: **設計＋基盤SQLのみ。UI・API 未実装。**
> ★**前提: Supabase Auth（auth.users）の導入が先に必要**（architecture.md「8」参照）。
> 現状アプリは localStorage 中心＋匿名同期で、ログインユーザーが存在しないため、
> 認証基盤の導入なしに家族連携（本人・家族の識別、共有範囲制御）は成立しない。

## 追加ファイル
- `supabase/family_layer_d.sql` … families / family_members / family_invites / vitals ＋ RLS
  （auth.users 参照。Auth 導入後に SQL Editor で実行）

## ロール
owner / adult / guardian（見守り）/ dependent（被見守り）

## 共有ポリシー（既定）
- 会話(ai_conversations/ai_messages)・個人メモ(ai_memories)は **非共有**
- 血圧など vitals は `share_vitals` が true の家族にのみ閲覧許可
- ブリーフィングは `share_briefing`

## 実装ステップ（Auth 導入後）
1. Supabase Auth（匿名＋Google linkIdentity 等）をアプリに導入
2. `family_layer_d.sql` を実行
3. API: 家族作成 / 招待発行(token) / 招待受諾 / 共有トグル / 見守りダッシュボード
4. UI: 家族設定画面、招待受諾 `/invite/[token]`、見守りダッシュボード
5. 既存の記録があれば `vitals` に統合
6. 2アカウントで共有ON/OFFの見え方を結合テスト

## MVP 提案
v1: 家族作成・招待(URLトークン)・血圧の家族閲覧 → v2: 見守りダッシュボード・代理入力 →
v3: 会話/メモの選択共有・プッシュ通知連携
