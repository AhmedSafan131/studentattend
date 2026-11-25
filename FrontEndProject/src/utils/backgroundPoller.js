// One request at a time. Socket bursts share a refresh, hidden tabs pause,
// and failures back off rather than adding requests to an overloaded server.
export const createBackgroundPoller = (task, {
  intervalMs = 15000,
  minimumGapMs = 3000,
  immediate = true,
} = {}) => {
  let timer;
  let stopped = false;
  let running = false;
  let pending = false;
  let lastFinished = -Infinity;
  let failures = 0;

  const delay = () => failures ? Math.min(120000, intervalMs * (2 ** Math.min(failures, 4))) : minimumGapMs;
  const schedule = (wait) => {
    clearTimeout(timer);
    if (!stopped && document.visibilityState !== 'hidden') timer = setTimeout(run, wait);
  };
  const run = async () => {
    if (stopped || running || document.visibilityState === 'hidden') return;
    running = true;
    pending = false;
    try {
      await task();
      failures = 0;
    } catch {
      failures += 1;
    } finally {
      running = false;
      lastFinished = Date.now();
      schedule(failures || pending ? delay() : intervalMs);
    }
  };
  const trigger = () => {
    if (stopped) return;
    pending = true;
    if (!running) schedule(Math.max(0, lastFinished + delay() - Date.now()));
  };
  const visibilityChanged = () => {
    if (document.visibilityState === 'hidden') clearTimeout(timer);
    else trigger();
  };
  document.addEventListener('visibilitychange', visibilityChanged);
  if (immediate) trigger();
  else schedule(intervalMs);

  return {
    trigger,
    stop: () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibilityChanged);
    },
  };
};
