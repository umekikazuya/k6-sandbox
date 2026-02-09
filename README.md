# k6-sandbox

k6を使用した負荷検証のベストプラクティス集とテンプレート集

## 📋 概要

このリポジトリは、k6負荷検証ツールを使用した実務で即座に活用できるテストシナリオとベストプラクティスを提供します。ローカルのモックAPIサーバーに対して様々な負荷パターンをテストできます。

## ✨ 特徴

- 📚 **20+のテストシナリオ** - 基礎から実践まで段階的に学習
- 🎯 **6種類の負荷パターン** - Smoke/Load/Stress/Spike/Soak/Breakpoint
- 🔧 **モックAPIサーバー** - すぐに試せる検証環境
- 📊 **メトリクスと可観測性** - InfluxDB + Grafana統合
- 🚀 **CI/CD統合** - GitHub Actions ワークフロー付属
- 📖 **充実したドキュメント** - 日本語での詳細解説

## 🏗️ プロジェクト構成

```
k6-sandbox/
├── mock-server/          # テスト対象のモックAPIサーバー（Node.js/Express）
├── scenarios/            # k6テストシナリオ集
│   ├── 01-basics/       # 基本的なHTTPリクエスト（5シナリオ）
│   ├── 02-load-patterns/ # 各種負荷パターン（6シナリオ）
│   ├── 03-realistic/    # 実践的なシナリオ（5シナリオ）
│   ├── 04-metrics/      # メトリクス・可観測性（4シナリオ）
│   └── 05-cicd/         # CI/CD統合（2シナリオ）
├── utils/               # 共通ユーティリティ関数
├── docs/                # ドキュメント・ベストプラクティス
├── grafana/             # Grafana設定
└── docker-compose.yml   # Docker Compose設定
```

## 🚀 クイックスタート

### 前提条件

- [Docker](https://www.docker.com/) と Docker Compose がインストールされていること
- [k6](https://k6.io/docs/getting-started/installation/) がインストールされていること（または Dockerで実行）

### 1. リポジトリをクローン

```bash
git clone <repository-url>
cd k6-sandbox
```

### 2. モックサーバーの起動

```bash
# Docker Composeでモックサーバーを起動
docker compose up -d mock-server

# ヘルスチェック
curl http://localhost:3000/health
```

### 3. k6テストの実行

```bash
# シンプルなテストを実行
k6 run scenarios/01-basics/01-simple-http.js

# または Dockerで実行
docker run --rm -i --network=host \
  grafana/k6 run - < scenarios/01-basics/01-simple-http.js
```

## 📚 シナリオガイド

### 01-basics: 基本シナリオ（5シナリオ）

k6の基本的な機能と使い方を学びます。

- `01-simple-http.js` - 最もシンプルなGETリクエスト
- `02-http-methods.js` - GET/POST/PUT/DELETE
- `03-checks.js` - レスポンス検証
- `04-thresholds.js` - 閾値設定
- `05-variables.js` - 環境変数・設定の外部化

[詳細はこちら →](scenarios/01-basics/README.md)

### 02-load-patterns: 負荷パターン（6シナリオ）

6種類の主要な負荷テストパターンを提供します。

| テスト種類 | VU数 | 実行時間 | 目的 |
|-----------|------|---------|------|
| Smoke Test | 1-2 | 1-5分 | 基本動作確認 |
| Load Test | 10-100 | 5-30分 | 通常負荷での性能測定 |
| Stress Test | 50-200+ | 10-30分 | 限界点の把握 |
| Spike Test | 10→200 | 5-15分 | 急激な負荷変動への対応 |
| Soak Test | 10-50 | 数時間 | 長時間稼働の安定性 |
| Breakpoint Test | 段階的増加 | 20-60分 | 破綻点の特定 |

[詳細はこちら →](scenarios/02-load-patterns/README.md)

### 03-realistic: 実践的なシナリオ（5シナリオ）

実務で頻繁に遭遇するパターンを再現します。

- `01-authentication.js` - JWT認証フロー
- `02-user-journey.js` - 複雑なユーザーフロー
- `03-data-correlation.js` - データの引き継ぎ
- `04-file-upload.js` - ファイルアップロード
- `06-batch-requests.js` - バッチ処理と並列リクエスト

[詳細はこちら →](scenarios/03-realistic/README.md)

### 04-metrics: メトリクスと可観測性（4シナリオ）

詳細なパフォーマンス分析と可観測性を実現します。

- `01-custom-metrics.js` - カスタムメトリクス
- `02-tags.js` - タグ付けとフィルタリング
- `03-groups.js` - グルーピング
- `04-trends.js` - トレンド分析

[詳細はこちら →](scenarios/04-metrics/README.md)

### 05-cicd: CI/CD統合（2シナリオ）

CI/CDパイプラインでの負荷テスト自動化を実現します。

- `01-threshold-validation.js` - 閾値ベースの自動判定
- `02-json-output.js` - JSON/HTMLレポート生成

[詳細はこちら →](scenarios/05-cicd/README.md)

## 📊 モックAPIエンドポイント

モックサーバーは以下のエンドポイントを提供します：

### 基本的なREST API
- `GET /api/users` - ユーザー一覧取得
- `GET /api/users/:id` - ユーザー詳細取得
- `POST /api/users` - ユーザー作成
- `PUT /api/users/:id` - ユーザー更新
- `DELETE /api/users/:id` - ユーザー削除

### 認証
- `POST /api/auth/login` - ログイン（JWTトークン発行）
- `GET /api/auth/me` - トークン検証

### パフォーマンステスト用
- `GET /api/delay/:ms` - 指定ミリ秒の遅延後にレスポンス
- `GET /api/random-delay` - ランダムな遅延（100ms～2000ms）

### エラーテスト用
- `GET /api/status/:code` - 指定ステータスコードを返す
- `GET /api/random-error` - 20%の確率で500エラー

### その他
- `GET /api/large-payload?size=N` - 大きなJSONレスポンス
- `POST /api/upload` - ファイルアップロードのモック

## 📈 InfluxDB + Grafana 統合

### 起動

```bash
# InfluxDB + Grafana + モックサーバーを起動
docker compose up -d

# Grafanaにアクセス
open http://localhost:3001
```

### k6からInfluxDBへデータ送信

```bash
k6 run --out influxdb=http://localhost:8086/k6 scenarios/02-load-patterns/02-load-test.js
```

### Grafanaで可視化

1. ブラウザで `http://localhost:3001` を開く
2. データソース（InfluxDB）が自動設定済み
3. k6の実行結果がリアルタイムで表示

## 🔄 CI/CD統合

### GitHub Actions

```yaml
name: k6 Load Tests

on:
  pull_request:
    branches: [main]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run k6 test
        uses: grafana/k6-action@v0.3.0
        with:
          filename: scenarios/05-cicd/01-threshold-validation.js
        env:
          BASE_URL: http://localhost:3000
```

[詳細はこちら →](.github/workflows/k6-tests.yml)

## 🛠️ 開発

### モックサーバーのローカル実行

```bash
cd mock-server
npm install
npm start
```

### テストの実行

```bash
# 基本シナリオ
k6 run scenarios/01-basics/01-simple-http.js

# 環境変数を指定
BASE_URL=http://staging-api.example.com k6 run scenarios/01-basics/05-variables.js

# デバッグモード
k6 run --http-debug scenarios/01-basics/03-checks.js
```

### すべてのコンテナを停止

```bash
docker compose down
```

## 📖 ドキュメント

- [ベストプラクティス](docs/best-practices.md) - 実務で役立つベストプラクティス集
- [トラブルシューティング](docs/troubleshooting.md) - よくある問題と解決方法

## 💡 学習パス

k6を初めて使う場合、以下の順序で進めることをお勧めします：

1. **基礎を学ぶ** → `scenarios/01-basics/` （30分）
2. **負荷パターンを理解** → `scenarios/02-load-patterns/` （1時間）
3. **実践シナリオを試す** → `scenarios/03-realistic/` （1時間）
4. **メトリクスを活用** → `scenarios/04-metrics/` （30分）
5. **CI/CDに統合** → `scenarios/05-cicd/` （30分）

合計: 約3.5時間で基礎から実践まで習得可能

## 🤝 コントリビューション

Issue、Pull Requestを歓迎します！

1. Fork する
2. Feature ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. Commit する (`git commit -m 'Add amazing feature'`)
4. Push する (`git push origin feature/amazing-feature`)
5. Pull Request を作成

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🙏 謝辞

- [k6](https://k6.io/) - 素晴らしい負荷検証ツール
- [Grafana](https://grafana.com/) - 可視化プラットフォーム
- [InfluxDB](https://www.influxdata.com/) - 時系列データベース

## 📞 サポート

質問や問題がある場合：

- [Issue を作成](../../issues)
- [k6 Community Forum](https://community.k6.io/)
- [k6 Slack](https://k6.io/slack)

---

Happy Load Testing! 🚀