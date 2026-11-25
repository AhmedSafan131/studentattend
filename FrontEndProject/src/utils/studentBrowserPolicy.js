export const STUDENT_BROWSER_BLOCKED = 'STUDENT_BROWSER_BLOCKED';
export const STUDENT_BROWSER_MESSAGE = 'برجاء الدخول باستخدام Shortcut أو Google Chrome أو Safari.';
const listeners = new Set();
let access = { blocked: false, enabled: false, detected: false, verifiedRole: null };
export const getStudentBrowserAccess = () => access;
export const subscribeStudentBrowserAccess = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
export const updateStudentBrowserAccess = (changes) => {
  access = { ...access, ...changes };
  listeners.forEach((listener) => listener());
};
export const isStudentBrowserBlocked = () => access.blocked;
export const studentBrowserError = () => Object.assign(new Error(STUDENT_BROWSER_MESSAGE), {
  response: { status: 403, data: { errorCode: STUDENT_BROWSER_BLOCKED, message: STUDENT_BROWSER_MESSAGE } },
});
export const blockStudentBrowser = () => updateStudentBrowserAccess({ blocked: true, verifiedRole: 'student' });

// These are detection signals, not browser attestation. Unknown is never proof
// of an allowed browser, and is not automatically classified as Brave either.
export async function detectBrave(nav = (typeof navigator === 'undefined' ? undefined : navigator), timeoutMs = 1200) {
  let timer;
  try {
    if (/\bBrave(?:\/|\b)/i.test(nav?.userAgent || '')
      || nav?.userAgentData?.brands?.some((brand) => /^Brave$/i.test(brand.brand))) return 'detected';
    if (typeof nav?.brave?.isBrave !== 'function') return 'unknown';
    return await Promise.race([
      Promise.resolve().then(() => nav.brave.isBrave()).then((value) => value === true ? 'detected' : 'not-detected'),
      new Promise((resolve) => { timer = setTimeout(() => resolve('unknown'), timeoutMs); }),
    ]);
  } catch { return 'unknown'; }
  finally { clearTimeout(timer); }
}

export function enforceDetectedStudentContext(role) {
  // role must come from a server identity response, never the login picker or storage.
  if (role === 'student' && access.enabled && access.detected) {
    blockStudentBrowser();
    throw studentBrowserError();
  }
}
