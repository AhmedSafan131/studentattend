import { createBackgroundPoller } from './backgroundPoller';

beforeEach(() => {
  jest.useFakeTimers('modern');
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});
afterEach(() => jest.useRealTimers());
const advance = async (ms) => {
  jest.advanceTimersByTime(ms);
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

test('a burst of socket events does not overlap or duplicate an in-flight refresh', async () => {
  let resolve;
  const task = jest.fn(() => new Promise((done) => { resolve = done; }));
  const poller = createBackgroundPoller(task);
  await advance(0);
  for (let i = 0; i < 100; i += 1) poller.trigger();
  await advance(60000);
  expect(task).toHaveBeenCalledTimes(1);
  resolve();
  await Promise.resolve();
  await advance(2999);
  expect(task).toHaveBeenCalledTimes(1);
  await advance(1);
  expect(task).toHaveBeenCalledTimes(2);
  poller.stop();
  resolve();
  await Promise.resolve();
  await advance(60000);
  expect(task).toHaveBeenCalledTimes(2);
});

test('socket events cannot bypass failure backoff', async () => {
  const task = jest.fn().mockRejectedValue(new Error('unavailable'));
  const poller = createBackgroundPoller(task);
  await advance(0);
  poller.trigger();
  await advance(29999);
  expect(task).toHaveBeenCalledTimes(1);
  await advance(10);
  expect(task).toHaveBeenCalledTimes(2);
  poller.stop();
});

test('hidden tabs pause polling and becoming visible requests a refresh', async () => {
  const task = jest.fn().mockResolvedValue();
  const poller = createBackgroundPoller(task, { immediate: false });
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
  await advance(60000);
  expect(task).not.toHaveBeenCalled();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  document.dispatchEvent(new Event('visibilitychange'));
  await advance(0);
  expect(task).toHaveBeenCalledTimes(1);
  poller.stop();
});
