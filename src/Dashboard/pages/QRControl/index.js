import React, { useState } from 'react';
import { useLanguage } from '../../../i18n';

const Toggle = ({ label, desc, value, onChange }) => (
  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
    <div>
      <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{label}</div>
      {desc && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{desc}</div>}
    </div>
    <button onClick={()=>onChange(!value)} style={{ width:44, height:24, borderRadius:12, border:'none', cursor:'pointer', flexShrink:0, background:value?'var(--accent)':'rgba(255,255,255,0.12)', position:'relative', transition:'background 0.25s' }}>
      <span style={{ position:'absolute', top:3, left:value?23:3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.25s', display:'block', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }} />
    </button>
  </div>
);

const QRControlPage = () => {
  const { isRTL, t } = useLanguage();
  const [settings, setSettings] = useState({ expirySeconds:30, refreshAuto:true, allowLate:true, lateWindowMins:10, maxScansPerCode:1, requireGPS:false, showCountdown:true, codeSize:260 });
  const [saved, setSaved] = useState(false);

  const set = (key, val) => { setSettings(p=>({...p,[key]:val})); setSaved(false); };
  const handleSave = () => { setSaved(true); setTimeout(()=>setSaved(false),2500); };

  const activeSessions = [
    { doctor:'Dr. Ahmed Al-Rashid', course:'CS301 – Algorithms', section:'A', week:6, since:'10:15 AM', scanned:18 },
    { doctor:'Dr. Sara Khalil',     course:'CS401 – Soft. Eng.', section:'B', week:5, since:'09:50 AM', scanned:24 },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }} dir={isRTL?'rtl':'ltr'}>
      <div>
        <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)' }}>{t('qrControlTitle')}</h2>
        <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>{t('qrControlSubtitle')}</p>
      </div>

      <div className="card">
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
          <span style={{ width:10, height:10, borderRadius:'50%', background:'#34d399', display:'inline-block', animation:'pulseAnim 1.5s infinite' }} />
          <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{t('liveSessions')} ({activeSessions.length} {t('active')})</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {activeSessions.map((s,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', gap:16, padding:'12px 16px', background:'var(--bg-card2)', borderRadius:10, border:'1px solid rgba(52,211,153,0.15)' }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#1a6b45,#34d399)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13, flexShrink:0 }}>{s.doctor.split(' ').map(w=>w[0]).slice(1,3).join('')}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{s.doctor}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{s.course} · Section {s.section} · Week {s.week}</div>
              </div>
              <div style={{ textAlign:'center' }}><div style={{ fontSize:20, fontWeight:800, color:'#34d399' }}>{s.scanned}</div><div style={{ fontSize:10, color:'var(--text-muted)' }}>{t('scanned')}</div></div>
              <div style={{ textAlign:'center' }}><div style={{ fontSize:12, color:'var(--text-secondary)' }}>{s.since}</div><div style={{ fontSize:10, color:'var(--text-muted)' }}>{t('started')}</div></div>
              <button style={{ padding:'5px 12px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'#f87171', fontSize:12, fontWeight:700, cursor:'pointer' }}>{t('forceEnd')}</button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div className="card" style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div className="card-title">{t('qrTiming')}</div>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:6 }}>{t('qrExpiry')} — {settings.expirySeconds}s</label>
            <input type="range" min={10} max={120} step={5} value={settings.expirySeconds} onChange={e=>set('expirySeconds',+e.target.value)} style={{ width:'100%', accentColor:'var(--accent)' }} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-muted)', marginTop:2 }}><span>10s</span><span>120s</span></div>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:6 }}>{t('qrSize')} — {settings.codeSize}px</label>
            <input type="range" min={180} max={350} step={10} value={settings.codeSize} onChange={e=>set('codeSize',+e.target.value)} style={{ width:'100%', accentColor:'var(--accent)' }} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-muted)', marginTop:2 }}><span>{t('small')}</span><span>{t('large')}</span></div>
          </div>
          <Toggle label={t('showCountdown')} desc={t('showCountdownDesc')} value={settings.showCountdown} onChange={v=>set('showCountdown',v)} />
          <Toggle label={t('autoRefresh')}   desc={t('autoRefreshDesc')}   value={settings.refreshAuto}   onChange={v=>set('refreshAuto',v)} />
        </div>
        <div className="card" style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div className="card-title">{t('attendanceRules')}</div>
          <Toggle label={t('allowLate')} desc={t('allowLateDesc')} value={settings.allowLate} onChange={v=>set('allowLate',v)} />
          {settings.allowLate && (
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:6 }}>{t('lateWindow')} — {settings.lateWindowMins} {t('minutes')}</label>
              <input type="range" min={0} max={30} step={5} value={settings.lateWindowMins} onChange={e=>set('lateWindowMins',+e.target.value)} style={{ width:'100%', accentColor:'#f59e0b' }} />
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-muted)', marginTop:2 }}><span>0</span><span>30 {t('minutes')}</span></div>
            </div>
          )}
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:6 }}>{t('maxScans')}</label>
            <select value={settings.maxScansPerCode} onChange={e=>set('maxScansPerCode',+e.target.value)} className="form-select">
              <option value={1}>{t('scan1')}</option>
              <option value={3}>{t('scan3')}</option>
              <option value={0}>{t('scanUnlimited')}</option>
            </select>
          </div>
          <Toggle label={t('requireGPS')} desc={t('requireGPSDesc')} value={settings.requireGPS} onChange={v=>set('requireGPS',v)} />
        </div>
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <button onClick={handleSave} style={{ padding:'11px 32px', borderRadius:10, border:'none', background:saved?'linear-gradient(135deg,#059669,#34d399)':'linear-gradient(135deg,#1a6b45,#22874f)', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', boxShadow:'0 4px 14px rgba(26,107,69,0.3)', transition:'all 0.3s' }}>
          {saved?t('savedQR'):t('saveQR')}
        </button>
      </div>
    </div>
  );
};

export default QRControlPage;
