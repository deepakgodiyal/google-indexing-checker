// ============================================
// HTTP Status Code Checker - API Route
// ============================================
// Follows ALL redirects and returns FINAL status code
// e.g. URL → 302 → 302 → 404 = shows "404 Not Found"
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

function getStatusLabel(code, wasRedirected) {
  let label = '';
  if (code >= 200 && code < 300) label = `${code} OK`;
  else if (code === 301) label = '301 Redirect';
  else if (code === 302) label = '302 Temp Redirect';
  else if (code === 303) label = '303 See Other';
  else if (code === 307) label = '307 Temp Redirect';
  else if (code === 308) label = '308 Permanent Redirect';
  else if (code === 400) label = '400 Bad Request';
  else if (code === 401) label = '401 Unauthorized';
  else if (code === 403) label = '403 Forbidden';
  else if (code === 404) label = '404 Not Found';
  else if (code === 410) label = '410 Gone';
  else if (code === 429) label = '429 Too Many Requests';
  else if (code === 500) label = '500 Server Error';
  else if (code === 502) label = '502 Bad Gateway';
  else if (code === 503) label = '503 Unavailable';
  else if (code >= 300 && code < 400) label = `${code} Redirect`;
  else if (code >= 400 && code < 500) label = `${code} Client Error`;
  else if (code >= 500) label = `${code} Server Error`;
  else label = `${code}`;

  return label;
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
    // Strategy: Follow redirects to get FINAL status code
    let response;

    // Try GET request with redirect: 'follow' to get final status
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
        redirect: 'follow', // Follow all redirects, get FINAL page status
      });
    } catch (fetchError) {
      // If GET fails completely, try HEAD
      try {
        response = await fetch(url, {
          method: 'HEAD',
          headers: {
            'User-Agent': getRandomUserAgent(),
            'Accept': '*/*',
          },
          signal: AbortSignal.timeout(10000),
          redirect: 'follow',
        });
      } catch {
        throw fetchError;
      }
    }

    const code = response.status;
    const wasRedirected = response.redirected || false;
    const finalUrl = response.url || url;

    return {
      url,
      statusCode: code,
      statusLabel: getStatusLabel(code, wasRedirected),
      category: getStatusCategory(code),
      redirected: wasRedirected,
      finalUrl: wasRedirected ? finalUrl : null,
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
