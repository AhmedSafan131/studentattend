import React, { useState } from 'react';
import { useLanguage } from '../../../i18n';
import AppHelmet from '../../../components/AppHelmet';

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

const SaveBtn = ({ label, saved, onClick }) => (
  <div style={{ display:'flex', justifyContent:'flex-end', marginTop:4 }}>
    <button onClick={onClick} style={{ padding:'9px 24px', borderRadius:8, border:'none', background:saved?'linear-gradient(135deg,#059669,#34d399)':'linear-gradient(135deg,#1a6b45,#22874f)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', transition:'background 0.3s' }}>{label}</button>
  </div>
);

const lbl = { fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:1, display:'block', marginBottom:6 };
const inp = { width:'100%', padding:'10px 14px', borderRadius:8, background:'var(--bg-dark)', border:'1px solid var(--border)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', outline:'none' };

const SettingsPage = () => {
  const { isRTL, lang, toggleLang, theme, toggleTheme, t } = useLanguage();
  const [university, setUniversity] = useState({ name:'Menoufia National University', nameAr:'جامعة المنوفية الأهلية', email:'admin@university.edu', phone:'+20 48 123 4567', website:'www.mnu.edu.eg', semester:'Spring 2026', academicYear:'2025 – 2026', totalWeeks:14 });
  const [notifications, setNotifications] = useState({ emailOnNewTicket:true, emailOnLecture:false, dashboardAlerts:true, lowAttendanceAlert:true, lowThreshold:60 });
  const [security, setSecurity] = useState({ sessionTimeout:60, requireStrongPass:false, allowMultipleLogins:false });
  const [saved, setSaved] = useState('');
  const handleSave = (section) => { setSaved(section); setTimeout(()=>setSaved(''),2500); };
  const setU = (k,v) => setUniversity(p=>({...p,[k]:v}));
  const setN = (k,v) => setNotifications(p=>({...p,[k]:v}));
  const setS = (k,v) => setSecurity(p=>({...p,[k]:v}));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }} dir={isRTL?'rtl':'ltr'}>
      <AppHelmet
        titleEn="Settings"
        titleAr="الإعدادات"
        descriptionEn="Manage appearance, university information, notifications, and security settings."
        descriptionAr="إدارة إعدادات المظهر ومعلومات الجامعة والإشعارات والحماية."
      />
      <div>
        <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)' }}>{t('settingsTitle')}</h2>
        <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>{t('settingsSubtitle')}</p>
      </div>

      <div className="card" style={{ display:'flex', flexDirection:'column', gap:18 }}>
        <div className="card-title">{t('appearance')}</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div style={{ padding:16, background:'var(--bg-card2)', borderRadius:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div><div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>{theme==='dark'?t('darkMode'):t('lightMode')}</div><div style={{ fontSize:11, color:'var(--text-muted)' }}>{t('toggleThemeDesc')}</div></div>
            <button onClick={toggleTheme} style={{ padding:'8px 18px', borderRadius:8, border:'1px solid var(--border)', background:theme==='dark'?'rgba(96,165,250,0.1)':'rgba(245,158,11,0.1)', color:theme==='dark'?'#60a5fa':'#f59e0b', fontSize:13, fontWeight:700, cursor:'pointer' }}>{theme==='dark'?t('switchToLight'):t('switchToDark')}</button>
          </div>
          <div style={{ padding:16, background:'var(--bg-card2)', borderRadius:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div><div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>🌐 {lang==='en'?'English':'العربية'}</div><div style={{ fontSize:11, color:'var(--text-muted)' }}>{t('toggleLangDesc')}</div></div>
            <button onClick={toggleLang} style={{ padding:'8px 18px', borderRadius:8, border:'1px solid var(--border)', background:'rgba(99,102,241,0.1)', color:'#818cf8', fontSize:13, fontWeight:700, cursor:'pointer' }}>{lang==='en'?'عربي':'English'}</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div className="card-title">{t('universityInfo')}</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {[{label:t('uniNameEn'),key:'name'},{label:t('uniNameAr'),key:'nameAr'},{label:t('adminEmail'),key:'email'},{label:t('phone'),key:'phone'},{label:t('website'),key:'website'},{label:t('semester'),key:'semester'},{label:t('academicYear'),key:'academicYear'}].map(f=>(
            <div key={f.key}><label style={lbl}>{f.label}</label><input value={university[f.key]} onChange={e=>setU(f.key,e.target.value)} style={inp} /></div>
          ))}
          <div><label style={lbl}>{t('totalWeeks')}</label><input type="number" min={1} max={20} value={university.totalWeeks} onChange={e=>setU('totalWeeks',+e.target.value)} style={inp} /></div>
        </div>
        <SaveBtn label={saved==='uni'?t('saved'):t('saveChanges')} saved={saved==='uni'} onClick={()=>handleSave('uni')} />
      </div>

      <div className="card" style={{ display:'flex', flexDirection:'column', gap:18 }}>
        <div className="card-title">{t('notifications')}</div>
        <Toggle label={t('emailNewTicket')}  desc={t('emailNewTicketDesc')}  value={notifications.emailOnNewTicket}   onChange={v=>setN('emailOnNewTicket',v)} />
        <Toggle label={t('emailLecture')}    desc={t('emailLectureDesc')}    value={notifications.emailOnLecture}     onChange={v=>setN('emailOnLecture',v)} />
        <Toggle label={t('dashboardAlerts')} desc={t('dashboardAlertsDesc')} value={notifications.dashboardAlerts}    onChange={v=>setN('dashboardAlerts',v)} />
        <Toggle label={t('lowAlert')}        desc={t('lowAlertDesc')}        value={notifications.lowAttendanceAlert} onChange={v=>setN('lowAttendanceAlert',v)} />
        {notifications.lowAttendanceAlert && (
          <div>
            <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:6 }}>{t('lowThreshold')} — {notifications.lowThreshold}%</label>
            <input type="range" min={30} max={90} step={5} value={notifications.lowThreshold} onChange={e=>setN('lowThreshold',+e.target.value)} style={{ width:'100%', accentColor:'#f59e0b' }} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-muted)', marginTop:2 }}><span>30%</span><span>90%</span></div>
          </div>
        )}
        <SaveBtn label={saved==='notif'?t('saved'):t('saveChanges')} saved={saved==='notif'} onClick={()=>handleSave('notif')} />
      </div>

      <div className="card" style={{ display:'flex', flexDirection:'column', gap:18 }}>
        <div className="card-title">{t('security')}</div>
        <div>
          <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:6 }}>{t('sessionTimeout')} — {security.sessionTimeout} {t('minutes')}</label>
          <input type="range" min={15} max={240} step={15} value={security.sessionTimeout} onChange={e=>setS('sessionTimeout',+e.target.value)} style={{ width:'100%', accentColor:'var(--primary)' }} />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-muted)', marginTop:2 }}><span>15</span><span>240</span></div>
        </div>
        <Toggle label={t('strongPass')} desc={t('strongPassDesc')} value={security.requireStrongPass}   onChange={v=>setS('requireStrongPass',v)} />
        <Toggle label={t('multiLogin')} desc={t('multiLoginDesc')} value={security.allowMultipleLogins} onChange={v=>setS('allowMultipleLogins',v)} />
        <SaveBtn label={saved==='sec'?t('saved'):t('saveChanges')} saved={saved==='sec'} onClick={()=>handleSave('sec')} />
      </div>

      <div className="card" style={{ border:'1px solid rgba(239,68,68,0.2)', display:'flex', flexDirection:'column', gap:14 }}>
        <div className="card-title" style={{ color:'#f87171' }}>{t('dangerZone')}</div>
        {[{label:t('clearData'),desc:t('clearDataDesc'),btn:t('clearDataBtn')},{label:t('resetDoctors'),desc:t('resetDoctorsDesc'),btn:t('resetDoctorsBtn')}].map(item=>(
          <div key={item.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'rgba(239,68,68,0.05)', borderRadius:10 }}>
            <div><div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{item.label}</div><div style={{ fontSize:11, color:'var(--text-muted)' }}>{item.desc}</div></div>
            <button style={{ padding:'8px 18px', borderRadius:8, border:'1px solid rgba(239,68,68,0.35)', background:'rgba(239,68,68,0.1)', color:'#f87171', fontSize:13, fontWeight:700, cursor:'pointer' }}>{item.btn}</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SettingsPage;
