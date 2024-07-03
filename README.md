# README

ジョーシスAPIをGoogle App Scriptを用いて呼び出すサンプルスクリプトです。
メンバー台帳連携のサンプルとして、freee人事労務との連携コードを記述しています。デバイスAPIについては、現状ジョーシスからのデバイス一覧取得に対応しています。

## How to set up & deploy
node.js環境で、claspを使ってdeployします。

1. 必要なnodeモジュールのダウンロード（package.jsonから）

```
npm install
```

2. claspのインストール

```shell
npm install -g @google/clasp

# 必要に応じて、sudoで実行する
sudo npm install -g @google/clasp
```

3. claspでGoogleアカウントにログイン

```shell
clasp login
```

4. 新しいスプレッドシートを開き、App Scriptを作成。設定からスクリプトIDを特定し、clasp.jsonの該当箇所に貼り付ける

```json
{
    "scriptId": "<ここに貼り付ける>",
    "rootDir": "./src"
}
```

5. スクリプトをデプロイする

```shell
clasp push
```

## コード変更・拡張のイメージ

新しいデータソースと連携する場合、そのデータソースからデータを取得するコードを記述し、同時にシートを作成します。

例：smartHRとのカスタム連携を実装する場合

- `smarthr_members`というシートを作成
- `smarthr_api_client.js`と`smarthr_sheet.js`を作成
- `compute_diffs.ts`で、同期ロジックをカスタマイズ（メールアドレスをキーに比較、名前をキーに比較 etc...）

## TODO
- 部署の同期
- デバイス台帳の同期
  - カスタム項目を含む