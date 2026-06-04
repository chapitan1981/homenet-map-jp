import { useEffect, useState } from 'react';
import { APP_VERSION, APP_BUILD, APP_NAME } from '../version';
import { api } from '../api/client';
import { DEVICE_TEMPLATES } from '../types/templates';

export default function SettingsPage() {
  const [backendVersion,setBackendVersion]=useState<any>(null);

  useEffect(()=>{
    api.get('/version').then(res=>setBackendVersion(res.data)).catch(()=>setBackendVersion(null));
  },[]);

  return (
    <>
      <h2>設定</h2>
      <div className="card">
        <h3>システム情報</h3>
        <dl className="detail-list">
          <dt>アプリ名</dt><dd>{APP_NAME}</dd>
          <dt>Frontend</dt><dd>Ver {APP_VERSION} / {APP_BUILD}</dd>
          <dt>Backend</dt><dd>{backendVersion ? `Ver ${backendVersion.version} / ${backendVersion.build}` : '取得できません'}</dd>
        </dl>
      </div>
      <div className="card">
        <h3>登録済みテンプレート</h3>
        <ul>
          {DEVICE_TEMPLATES.map(t=><li key={t.id}><strong>{t.label}</strong>：{t.description}（{t.fields.length}項目）</li>)}
        </ul>
      </div>

      <div className="card">
        <h3>今後の予定</h3>
        <p>カスタム項目テンプレート、自動スキャン、Docker/Tailscale連携を追加予定です。</p>
      </div>
    </>
  );
}
