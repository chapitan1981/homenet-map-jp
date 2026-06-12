# Ver1.8.4 Timezone Backend Normalize

- フロント補正ではなくBackend/API側で時刻を正規化
- timezone_utils.pyを追加
- UTCタイムゾーンなし日時をJST ISO形式へ変換
- 監視/インフラ/ヘルス系APIの時刻返却を可能な範囲で正規化
- /api/time-debug を追加
- HTMLマニュアル更新
