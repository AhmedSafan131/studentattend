const stripApiSuffix = (pathname) => {
  const normalized = `/${String(pathname || '').replace(/^\/+|\/+$/g, '')}`;
  const withoutApiSuffix = normalized.replace(/\/api$/i, '');
  return withoutApiSuffix === '/' ? '' : withoutApiSuffix;
};

// API route constants already start with /api. Accept both deployment styles
// (`/attendance` and `/attendance/api`) without ever producing /api/api.
export const normalizeApiBaseUrl = (value) => {
  const rawValue = String(value || '').trim();
  if (!rawValue || rawValue === '/') return '';

  try {
    const isAbsolute = /^[a-z][a-z\d+.-]*:\/\//i.test(rawValue);
    const parsed = new URL(rawValue, 'https://app.local');
    const pathname = stripApiSuffix(parsed.pathname);

    return isAbsolute ? `${parsed.origin}${pathname}` : pathname;
  } catch (_) {
    return stripApiSuffix(rawValue);
  }
};

export const getApiBasePath = (baseUrl, origin = 'https://app.local') => {
  if (!baseUrl) return '';

  try {
    return stripApiSuffix(new URL(baseUrl, origin).pathname);
  } catch (_) {
    return '';
  }
};
