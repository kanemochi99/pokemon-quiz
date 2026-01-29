# Vercelデプロイ手順

## 前提条件
- GitHubアカウント
- Vercelアカウント（GitHubでサインアップ可能）

## 手順

### 1. GitHubリポジトリを作成

1. https://github.com/new にアクセス
2. リポジトリ名: `pokemon-quiz`（任意）
3. Public または Private を選択
4. **「Add a README file」のチェックは外す**（既にREADMEがあるため）
5. 「Create repository」をクリック

### 2. ローカルリポジトリをGitHubにプッシュ

GitHubに表示される指示に従って、以下のコマンドを実行：

```bash
git remote add origin https://github.com/YOUR_USERNAME/pokemon-quiz.git
git branch -M main
git push -u origin main
```

**注意**: `YOUR_USERNAME`を自分のGitHubユーザー名に置き換えてください。

### 3. Vercelにデプロイ

1. https://vercel.com にアクセス
2. 「Sign Up」または「Log In」（GitHubアカウントでログイン推奨）
3. 「Add New...」→「Project」をクリック
4. GitHubリポジトリ一覧から `pokemon-quiz` を選択
5. 「Import」をクリック
6. 設定はデフォルトのままで「Deploy」をクリック

### 4. デプロイ完了

数分後、デプロイが完了し、URLが発行されます。
例: `https://pokemon-quiz-xxxxx.vercel.app`

このURLをスマホのブラウザで開けば、アプリが使えます！

## トラブルシューティング

### ビルドエラーが発生した場合
- Vercelのログを確認
- ローカルで `npm run build` を実行してエラーがないか確認

### デプロイ後に更新する場合
1. コードを修正
2. `git add .`
3. `git commit -m "Update message"`
4. `git push`
5. Vercelが自動的に再デプロイ

## 補足

- Vercelは無料プランで十分使えます
- 自動HTTPS対応
- カスタムドメインも設定可能（有料）
