const normalizePathname = (value) => {
  const rawValue = String(value || '').trim();
  if (!rawValue || rawValue === '/') return '';

  try {
    const pathname = new URL(
      rawValue,
      typeof window === 'undefined' ? 'https://app.local' : window.location.origin,
    ).pathname;
    return pathname === '/' ? '' : `/${pathname.replace(/^\/+|\/+$/g, '')}`;
  } catch (_) {
    return '';
  }
};

export const APP_BASE_PATH = normalizePathname(process.env.PUBLIC_URL);

export const withAppBasePath = (path = '/') => {
  const normalizedPath = `/${String(path || '').replace(/^\/+/, '')}`;
  return `${APP_BASE_PATH}${normalizedPath}` || '/';
};

export const isWithinAppPath = (path, appPath) => {
  const target = withAppBasePath(appPath).replace(/\/$/, '');
  return path === target || path.startsWith(`${target}/`);
};

