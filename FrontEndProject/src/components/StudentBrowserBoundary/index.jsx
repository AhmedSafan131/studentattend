import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import Axios, { clearRuntimeAccessToken } from '../../utils/Axios';
import { signOut } from '../../redux/slices/authSlice';
import {
  blockStudentBrowser, detectBrave, getStudentBrowserAccess,
  subscribeStudentBrowserAccess, updateStudentBrowserAccess,
} from '../../utils/studentBrowserPolicy';
import BlockedStudentView from './BlockedStudentView';
import './policy.css';

const POLICY_CACHE = 'studentattend.studentBrowserPolicy';
const cachedPolicy = () => {
  try { return JSON.parse(localStorage.getItem(POLICY_CACHE) || 'null')?.enabled === true; }
  catch { return false; }
};

export default function StudentBrowserBoundary({ children }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // A stored token is only a credential for the context request, not proof of role.
  const token = useSelector((state) => state.auth.user?.token || '');
  const access = useSyncExternalStore(subscribeStudentBrowserAccess, getStudentBrowserAccess);
  const [check, setCheck] = useState({ status: 'checking', token: null });
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setCheck((current) => current.status === 'ready' ? current : { status: 'checking', token });
    (async () => {
      const detected = await detectBrave();
      let policy;
      try {
        const response = await Axios({ method: 'GET', path: '/api/student-browser-policy', timeout: 4000, signal: controller.signal });
        policy = response.data;
        try { localStorage.setItem(POLICY_CACHE, JSON.stringify({ enabled: policy.enabled === true })); } catch {}
      } catch (error) {
        if (controller.signal.aborted) return;
        // Offline cache is a UI preference only. It is never sent as permission
        // to the server. Old offline clients cannot be guaranteed to enforce updates.
        policy = { enabled: cachedPolicy(), braveDetected: false };
      }
      if (cancelled) return;
      // A later failed/negative JS probe must not undo a positive detection
      // already made in this browser document. Only disabling policy lifts it.
      const found = detected === 'detected' || policy.braveDetected === true || getStudentBrowserAccess().detected;
      updateStudentBrowserAccess({ enabled: policy.enabled === true, detected: found });
      if (policy.enabled && found) {
        try {
          const response = await Axios({ method: 'GET', path: '/api/auth/session-context', timeout: 5000, signal: controller.signal });
          if (cancelled) return;
          const role = response.data.role;
          if (role === 'student') blockStudentBrowser();
          else updateStudentBrowserAccess({ verifiedRole: role, blocked: false });
        } catch (error) {
          if (cancelled) return;
          if (error?.response?.data?.errorCode !== 'STUDENT_BROWSER_BLOCKED') {
            setCheck({ status: 'error', token });
            return;
          }
        }
      }
      if (!policy.enabled || !found) updateStudentBrowserAccess({ blocked: false, verifiedRole: null });
      if (!cancelled) setCheck({ status: 'ready', token });
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [token, revision]);

  useEffect(() => {
    window.addEventListener('focus', retry);
    window.addEventListener('online', retry);
    return () => { window.removeEventListener('focus', retry); window.removeEventListener('online', retry); };
  }, [retry]);

  const leaveStudentContext = async () => {
    try { await Axios({ method: 'POST', path: '/api/auth/logout', timeout: 4000 }); } catch {}
    clearRuntimeAccessToken();
    dispatch(signOut());
    updateStudentBrowserAccess({ blocked: false, verifiedRole: null });
    navigate('/');
    retry();
  };
  const studentPath = pathname === '/student' || pathname.startsWith('/student/');
  const blockedPath = access.enabled && access.detected && studentPath
    && !['staff', 'doctor', 'admin'].includes(access.verifiedRole);
  // A separate student URL can be blocked even when offline identity lookup
  // fails. Shared login/dashboard errors must remain neutral for other roles.
  const blocked = access.blocked || (check.status !== 'checking' && blockedPath);
  // Hold all app providers until the identity-only check completes. In
  // particular, a forged cached role cannot mount student data or a socket.
  if (check.status === 'checking' || (access.enabled && access.detected && check.token !== token)) return <main className="student-browser-screen" dir="rtl"><p role="status">جاري التحقق من إمكانية الدخول…</p></main>;
  if (blocked) return <BlockedStudentView onRetry={retry} onExit={leaveStudentContext} />;
  if (check.status === 'error') return <main className="student-browser-screen" dir="rtl"><section className="student-browser-card" role="alert"><h1>تعذر التحقق من الجلسة</h1><p>تحقق من الاتصال ثم أعد المحاولة. لم يتم تصنيف حسابك أو متصفحك على أنه محظور.</p><button type="button" onClick={retry}>إعادة المحاولة</button><button type="button" onClick={leaveStudentContext}>العودة لتسجيل الدخول</button></section></main>;
  return children;
}
