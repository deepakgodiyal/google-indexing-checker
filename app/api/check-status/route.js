// ============================================
// HTTP Status Code Checker - API Route
// ============================================
// Fetches each URL and returns the HTTP status code
// Uses HEAD request first (faster), falls back to GET
// ============================================

// Allow up to 60 seconds on Vercel (Hobby plan max)
export const maxDuration = 60;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getStatusLabel(code) {
  if (code >= 200 && code < 300) return `${code} OK`;
  if (code === 301) return '301 Redirect';
  if (code === 302) return '302 Temp Redirect';
  if (code === 303) return '303 See Other';
  if (code === 307) return '307 Temp Redirect';
  if (code === 308) return '308 Permanent Redirect';
  if (code === 400) return '400 Bad Request';
  if (code === 401) return '401 Unauthorized';
  if (code === 403) return '403 Forbidden';
  if (code === 404) return '404 Not Found';
  if (code === 410) return '410 Gone';
  if (code === 429) return '429 Too Many Requests';
  if (code === 500) return '500 Server Error';
  if (code === 502) return '502 Bad Gateway';
  if (code === 503) return '503 Unavailable';
  if (code >= 300 && code < 400) return `${code} Redirect`;
  if (code >= 400 && code < 500) return `${code} Client Error`;
  if (code >= 500) return `${code} Server Error`;
  return `${code}`;
}

function getStatusCategory(code) {
  if (code >= 200 && code < 300) return 'success';
  if (code >= 300 && code < 400) return 'redirect';
  if (code >= 400 && code < 500) return 'client-error';
  if (code >= 500) return 'server-error';
  return 'unknown';
}

async function checkStatusCode(url) {
  try {
    // Try HEAD request first (faster, no body download)
    let response;
    try {
      response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': '*/*',
        },
        signal: AbortSignal.timeout(10000),
        redirect: 'manual', // Don't auto-follow redirects - we want to see 301/302
      });
    } catch {
      // HEAD failed, try GET
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,*/*',
        },
        signal: AbortSignal.timeout(15000),
        redirect: 'manual',
      });
    }

    const code = response.status;
    return {
      url,
      statusCode: code,
      statusLabel: getStatusLabel(code),
      category: getStatusCategory(code),
    };
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return { url, statusCode: 0, statusLabel: 'Timeout', category: 'error' };
    }
    return { url, statusCode: 0, statusLabel: 'Error', category: 'error' };
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return Response.json(
        { error: 'Please provide an array of URLs.' },
        { status: 400 }
      );
    }

    if (urls.length > 10) {
      return Response.json(
        { error: 'Maximum 10 URLs per batch.' },
        { status: 400 }
      );
    }

    // Process URLs in parallel for speed
    const results = await Promise.all(
      urls.map((url) => checkStatusCode(url))
    );

    return Response.json({ results });
  } catch (error) {
    console.error('Status Check API Error:', error);
    return Response.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
