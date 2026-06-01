import { api } from '../api/client';

export default function BackupPage() {
  const download = async () => {
    const res = await api.get('/backup/export');
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'homenet-map-jp-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <h2>バックアップ</h2>
      <div className="card">
        <p>現在の登録データをJSON形式で出力します。</p>
        <button onClick={download}>JSONバックアップをダウンロード</button>
      </div>
    </>
  );
}
