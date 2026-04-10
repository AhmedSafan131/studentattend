import React, { useState } from 'react';
import { useLanguage } from '../../../i18n';

const CATEGORIES_EN = ['Technical Issue','Attendance Error','Course Problem','Account Access','Feature Request','Other'];
const CATEGORIES_AR = ['مشكلة فنية','خطأ في الحضور','مشكلة مقرر','الوصول للحساب','طلب ميزة','أخرى'];
const EMPTY_FORM = { subject:'', category:0, priority:'medium', body:'' };
let localId = 100;

const lbl = { fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:1, display:'block', marginBottom:6 };
const inp = { width:'100%', padding:'11px 14px', borderRadius:8, background:'var(--bg-dark)', border:'1px solid var(--border)', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', outline:'none' };
const err = { fontSize:11, color:'#f87171', marginTop:4 };

const DoctorTickets = ({ doctorName, doctorEmail }) => {
  const { isRTL, t } = useLanguage();
  const CATEGORIES = isRTL ? CATEGORIES_AR : CATEGORIES_EN;
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [myTickets, setMyTickets] = useState([]);
  const [errors,    setErrors]    = useState({});

  const set = (k,v) => { setForm(p=>({...p,[k]:v})); setErrors(p=>({...p,[k]:''})); };

  const validate = () => {
    const e = {};
    if (!form.subject.trim()) e.subject = t('subjectRequired');
    if (!form.body.trim())    e.body    = t('messageRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const ticket = { id:`TKT-${String(localId++).padStart(3,'0')}`, subject:form.subject, category:CATEGORIES_EN[form.category], priority:form.priority, body:form.body, from:doctorName||'Doctor', email:doctorEmail||'', role:'doctor', status:'open', createdAt:new Date().toISOString(), reply:'' };
    setMyTickets(prev=>[ticket,...prev]);
    setForm(EMPTY_FORM);
    setSubmitted(true);
    setTimeout(()=>setSubmitted(false),4000);
  };

  const statusLabel = { open:`🟡 ${t('ticketOpen')}`, inProgress:`🔵 ${t('ticketInProgress')}`, resolved:`✅ ${t('ticketResolved')}`, closed:`⚫ ${t('ticketClosed')}` };
  const statusColor = { open:'#f59e0b', inProgress:'#60a5fa', resolved:'#34d399', closed:'#6b7280' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:28 }} dir={isRTL?'rtl':'ltr'}>
      <div>
        <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text-primary)' }}>{t('sendTicketTitle')}</h2>
        <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>{t('sendTicketSubtitle')}</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:24, alignItems:'start' }}>
        <div className="card" style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div className="card-title">{t('newTicketCard')}</div>
          {submitted && (
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:10, background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.3)' }}>
              <span style={{ fontSize:24 }}>✅</span>
              <div><div style={{ fontSize:13, fontWeight:700, color:'#34d399' }}>{t('ticketSuccess')}</div><div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{t('ticketSuccessSub')}</div></div>
            </div>
          )}
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <div>
              <label style={lbl}>{t('fromLabel')}</label>
              <div style={{ padding:'10px 14px', borderRadius:8, background:'var(--bg-dark)', border:'1px solid var(--border)', fontSize:13, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:8 }}>
                <span>👨‍⚕️</span> {doctorName||'Doctor'} — {t('facultyMemberRole')}
              </div>
            </div>
            <div>
              <label style={lbl}>{t('subjectLabel')}</label>
              <input value={form.subject} onChange={e=>set('subject',e.target.value)} placeholder={t('subjectPlaceholder')} style={{...inp,borderColor:errors.subject?'#ef4444':''}} />
              {errors.subject && <p style={err}>{errors.subject}</p>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={lbl}>{t('categoryLabel')}</label>
                <select value={form.category} onChange={e=>set('category',+e.target.value)} className="form-select">
                  {CATEGORIES.map((c,i)=><option key={i} value={i}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>{t('priorityLabel')}</label>
                <select value={form.priority} onChange={e=>set('priority',e.target.value)} className="form-select">
                  <option value="high">{t('priorityHigh')}</option>
                  <option value="medium">{t('priorityMedium')}</option>
                  <option value="low">{t('priorityLow')}</option>
                </select>
              </div>
            </div>
            <div>
              <label style={lbl}>{t('messageLabel')}</label>
              <textarea rows={6} value={form.body} onChange={e=>set('body',e.target.value)} placeholder={t('messagePlaceholder')} style={{...inp,resize:'vertical',borderColor:errors.body?'#ef4444':''}} />
              {errors.body && <p style={err}>{errors.body}</p>}
            </div>
            <button type="submit" style={{ padding:'12px 24px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#1a6b45,#22874f)', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', boxShadow:'0 4px 14px rgba(26,107,69,0.3)', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {t('submitTicket')}
            </button>
          </form>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card" style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#818cf8', marginBottom:12 }}>{t('tipsTitle')}</div>
            {[t('tip1'),t('tip2'),t('tip3'),t('tip4')].map((tip,i)=>(
              <div key={i} style={{ display:'flex', gap:10, marginBottom:8 }}>
                <span style={{ color:'#818cf8', fontWeight:700, flexShrink:0 }}>{i+1}.</span>
                <span style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.6 }}>{tip}</span>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', fontSize:12, fontWeight:700, color:'var(--text-muted)' }}>{t('myTickets')} ({myTickets.length})</div>
            {myTickets.length===0 ? (
              <div style={{ padding:'30px 20px', textAlign:'center', color:'var(--text-muted)' }}><div style={{ fontSize:32, marginBottom:8, opacity:0.3 }}>📭</div><p style={{ fontSize:12 }}>{t('noMyTickets')}</p></div>
            ) : myTickets.map(tk=>(
              <div key={tk.id} style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)' }}>{tk.id}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:statusColor[tk.status] }}>{statusLabel[tk.status]}</span>
                </div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{tk.subject}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{tk.category} · {new Date(tk.createdAt).toLocaleDateString()}</div>
                {tk.reply && <div style={{ marginTop:8, padding:'8px 12px', background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:8 }}><div style={{ fontSize:10, fontWeight:700, color:'var(--accent)', marginBottom:4 }}>{t('adminReply')}</div><div style={{ fontSize:12, color:'var(--text-secondary)' }}>{tk.reply}</div></div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorTickets;
