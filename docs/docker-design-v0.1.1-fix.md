# HomeNet Map JP
## Docker構成修正版 Ver0.1.1

# 1. 修正理由

Vite はビルド時に環境変数を埋め込むため、Docker Compose の runtime environment で `VITE_API_BASE_URL` を渡しても、nginx配信後の静的ファイルには反映されない。

また、`http://localhost:3881/api` をブラウザ側で呼ぶと、サーバーではなく閲覧端末自身の localhost を参照してしまう。

# 2. 修正方針

Frontend Nginx に `/api` リバースプロキシを追加する。

ブラウザからは以下でアクセスする。

```text
http://サーバーIP:3880
```

APIは同一オリジンで呼び出す。

```text
/api
```

Nginx が backend コンテナへ転送する。

```text
http://backend:8000/api
```

# 3. メリット

- localhost 問題を回避
- CORS問題を回避
- Tailscale経由でも同じURL構成で動作
- サーバーIPが変わってもFrontendの再ビルド不要
