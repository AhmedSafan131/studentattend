import React, { useState } from 'react';
import { useLanguage } from '../../../i18n';
import AppHelmet from '../../../components/AppHelmet';

const STATUS_KEYS = {
  open:       { color:'#f59e0b', bg:'rgba(245,158,11,0.1)',   border:'rgba(245,158,11,0.3)'   },
  inProgress: { color:'#60a5fa', bg:'rgba(96,165,250,0.1)',   border:'rgba(96,165,250,0.3)'   },
  resolved:   { color:'#34d399', bg:'rgba(52,211,153,0.1)',   border:'rgba(52,211,153,0.3)'   },
  closed:     { color:'#6b7280', bg:'rgba(107,114,128,0.1)',  border:'rgba(107,114,128,0.3)'  },
};

const SEED_TICKETS = [
  { id:'TKT-001', from:'Dr. Ahmed Al-Rashid', role:'doctor', email:'ahmed@university.edu', subject:'QR Code not generating for CS301', body:'When I try to start a lecture for CS301 Section A, the QR code spinner never stops and no code appears. This has been happening since yesterday morning.', category:'Technical Issue', status:'open', priority:'high', createdAt:'2026-04-02T09:15:00Z', reply:'' },
  { id:'TKT-002', from:'Sara Mohammed', role:'student', email:'sara.m@students.edu', subject:'My attendance marked absent but I was present', body:'I attended the CS201 lecture on April 1st (Week 6, Section B). I scanned the QR code with my phone but my attendance shows as absent. Please correct this.', category:'Attendance Error', status:'inProgress', priority:'medium', createdAt:'2026-04-02T11:30:00Z', reply:'We are reviewing the attendance logs for that session. Please allow 24 hours.' },
  { id:'TKT-003', from:'Dr. Sara Khalil', role:'doctor', email:'sara@university.edu', subject:'Cannot access Software Engineering course section', body:'Section B of CS401 does not appear in my attendance dashboard even though it was assigned to me by the admin.', category:'Course Problem', status:'resolved', priority:'low', createdAt:'2026-04-01T14:00:00Z', reply:'Course assignment has been updated. Please log out and log back in.' },
];

const priorityStyle = {
  high:   { color:'#f87171', bg:'rgba(248,113,113,0.1)' },
  medium: { color:'#fbbf24', bg:'rgba(251,191,36,0.1)'  },
  low:    { color:'#34d399', bg:'rgba(52,211,153,0.1)'  },
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

const TicketsPage = () => {
  const { isRTL, t } = useLanguage();
  const [tickets,      setTickets]      = useState(SEED_TICKETS);
  const [selected,     setSelected]     = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole,   setFilterRole]   = useState('all');
  const [replyText,    setReplyText]    = useState('');

  const STATUS = {
    open:       { ...STATUS_KEYS.open,       label: t('ticketOpen')       },
    inProgress: { ...STATUS_KEYS.inProgress, label: t('ticketInProgress') },
    resolved:   { ...STATUS_KEYS.resolved,   label: t('ticketResolved')   },
    closed:     { ...STATUS_KEYS.closed,     label: t('ticketClosed')     },
  };

  const filtered = tickets.filter(tk =>
    (filterStatus === 'all' || tk.status === filterStatus) &&
    (filterRole   === 'all' || tk.role   === filterRole)
  );

  const counts = { all: tickets.length, open: tickets.filter(tk=>tk.status==='open').length, inProgress: tickets.filter(tk=>tk.status==='inProgress').length, resolved: tickets.filter(tk=>tk.status==='resolved').length };

  const handleStatusChange = (id, status) => { setTickets(prev=>prev.map(tk=>tk.id===id?{...tk,status}:tk)); if(selected?.id===id) setSelected(prev=>({...prev,status})); };
  const handleSendReply = () => {
    if (!replyText.trim() || !selected) return;
    setTickets(prev=>prev.map(tk=>tk.id===selected.id?{...tk,reply:replyText,status:tk.status==='open'?'inProgress':tk.status}:tk));
    setSelected(prev=>({...prev,reply:replyText,status:prev.status==='open'?'inProgress':prev.status}));
    setReplyText('');
  };
  const handleDeleteTicket = (id) => { setTickets(prev=>prev.filter(tk=>tk.id!==id)); if(selected?.id===id) setSelected(null); };
  const pill = (label, color, bg, border) => <span style={{ fontSize:11, fontWeight:700, color, background:bg, border:`1px solid ${border}`, borderRadius:20, padding:'2px 10px', display:'inline-block' }}>{label}</span>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }} dir={isRTL?'rtl':'ltr'}>
      <AppHelmet
        titleEn="Admin Support Tickets"
        titleAr="تذاكر الدعم للإدارة"
        descriptionEn="Review and respond to support tickets from doctors and students."
        descriptionAr="راجع ورد على تذاكر الدعم المرسلة من الأطباء والطلاب."
      />
      <div>
        <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)' }}>{t('ticketsTitle')}</h2>
        <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>{t('ticketsSubtitle')}</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[{key:'all',label:t('allTickets'),count:counts.all,color:'#818cf8',icon:'🎫'},{key:'open',label:t('ticketOpen'),count:counts.open,color:'#f59e0b',icon:'🟡'},{key:'inProgress',label:t('ticketInProgress'),count:counts.inProgress,color:'#60a5fa',icon:'🔵'},{key:'resolved',label:t('ticketResolved'),count:counts.resolved,color:'#34d399',icon:'✅'}].map(s=>(
          <div key={s.key} className="card" style={{ padding:16, display:'flex', alignItems:'center', gap:14, cursor:'pointer' }} onClick={()=>setFilterStatus(s.key)}>
            <span style={{ fontSize:24 }}>{s.icon}</span>
            <div><div style={{ fontSize:24, fontWeight:800, color:s.color, lineHeight:1 }}>{s.count}</div><div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{s.label}</div></div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        {['all','open','inProgress','resolved','closed'].map(s=>(
          <button key={s} onClick={()=>setFilterStatus(s)} style={{ padding:'6px 16px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', border:filterStatus===s?'none':'1px solid var(--border)', background:filterStatus===s?'var(--primary)':'var(--bg-card2)', color:filterStatus===s?'#fff':'var(--text-secondary)' }}>
            {s==='all'?t('filterAll'):STATUS[s]?.label}
          </button>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          {[{key:'all',label:t('filterAllRoles')},{key:'doctor',label:t('filterDoctor')},{key:'student',label:t('filterStudent')}].map(r=>(
            <button key={r.key} onClick={()=>setFilterRole(r.key)} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', border:filterRole===r.key?'none':'1px solid var(--border)', background:filterRole===r.key?'#4f46e5':'var(--bg-card2)', color:filterRole===r.key?'#fff':'var(--text-secondary)' }}>{r.label}</button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:20, minHeight:400 }}>
        <div className="card" style={{ padding:0, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', fontSize:13, fontWeight:700, color:'var(--text-muted)' }}>{filtered.length} SUPPORT TICKETS</div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {filtered.length===0 && <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}><div style={{ fontSize:36, marginBottom:12 }}>📭</div><p>{t('noTickets')}</p></div>}
            {filtered.map(tk=>{
              const st=STATUS[tk.status], pr=priorityStyle[tk.priority];
              return (
                <div key={tk.id} onClick={()=>{setSelected(tk);setReplyText(tk.reply||'');}} style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', cursor:'pointer', background:selected?.id===tk.id?'rgba(26,107,69,0.08)':'transparent', borderLeft:selected?.id===tk.id?'3px solid var(--accent)':'3px solid transparent', transition:'all 0.15s' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}><span style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)' }}>{tk.id}</span><span style={{ fontSize:10 }}>{tk.role==='doctor'?'👨‍⚕️':'🎓'}</span></div>
                    {pill(st.label,st.color,st.bg,st.border)}
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{tk.subject}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:11, color:'var(--text-secondary)' }}>{tk.from}</span>
                    <span style={{ fontSize:10, background:pr.bg, color:pr.color, borderRadius:10, padding:'1px 8px', fontWeight:700 }}>{tk.priority==='high'?'🔴':tk.priority==='medium'?'🟡':'🟢'} {tk.priority}</span>
                  </div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>{formatDate(tk.createdAt)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {selected ? (
          <div className="card" style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div><div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{selected.id} · {selected.category}</div><h3 style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)' }}>{selected.subject}</h3></div>
              <button onClick={()=>handleDeleteTicket(selected.id)} style={{ padding:'5px 10px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'#f87171', fontSize:13, cursor:'pointer' }}>{t('deleteTicket')}</button>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:12, background:'var(--bg-card2)', borderRadius:10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:selected.role==='doctor'?'linear-gradient(135deg,#4f46e5,#818cf8)':'linear-gradient(135deg,#d97706,#fbbf24)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:14 }}>{selected.from.split(' ').map(w=>w[0]).slice(0,2).join('')}</div>
              <div><div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{selected.from}</div><div style={{ fontSize:11, color:'var(--text-muted)' }}>{selected.email} · {selected.role==='doctor'?t('filterDoctor'):t('filterStudent')}</div></div>
              <div style={{ marginLeft:'auto' }}>{pill(STATUS[selected.status].label,STATUS[selected.status].color,STATUS[selected.status].bg,STATUS[selected.status].border)}</div>
            </div>
            <div style={{ background:'var(--bg-card2)', borderRadius:10, padding:14, fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, flex:1 }}>{selected.body}</div>
            {selected.reply && <div style={{ background:'rgba(26,107,69,0.08)', border:'1px solid rgba(26,107,69,0.2)', borderRadius:10, padding:14 }}><div style={{ fontSize:11, fontWeight:700, color:'var(--accent)', marginBottom:6 }}>{t('adminReply')}</div><div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7 }}>{selected.reply}</div></div>}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:12, color:'var(--text-muted)', alignSelf:'center' }}>{t('changeStatus')}</span>
              {Object.entries(STATUS).map(([key,st])=>(
                <button key={key} onClick={()=>handleStatusChange(selected.id,key)} style={{ padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:700, cursor:'pointer', border:`1px solid ${st.border}`, background:selected.status===key?st.bg:'transparent', color:st.color }}>{st.label}</button>
              ))}
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:1, display:'block', marginBottom:6 }}>{t('replyTo')} {selected.from.toUpperCase()}</label>
              <textarea value={replyText} onChange={e=>setReplyText(e.target.value)} rows={3} placeholder="…" style={{ width:'100%', padding:12, borderRadius:10, background:'var(--bg-dark)', border:'1px solid var(--border)', color:'var(--text-primary)', fontSize:13, resize:'vertical', fontFamily:'inherit', outline:'none' }} />
              <button onClick={handleSendReply} style={{ marginTop:8, padding:'9px 20px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#1a6b45,#22874f)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', float:isRTL?'left':'right' }}>{t('sendReply')}</button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, color:'var(--text-muted)' }}>
            <span style={{ fontSize:48, opacity:0.3 }}>🎫</span>
            <p style={{ fontSize:14 }}>{t('selectTicket')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketsPage;
