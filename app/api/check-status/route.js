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
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
          },
          signal: AbortSignal.timeout(20000),
          redirect: 'follow',
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
            signal: AbortSignal.timeout(15000),
            redirect: 'follow',
          });
        } catch {
          throw fetchError;
        }
      }

      const code = response.status;
      const wasRedirected = response.redirected || false;
      const finalUrl = response.url || url;

      // Soft 404 detection: server returns 200 but page shows "not found" content
      if (code >= 200 && code < 300) {
        try {
          const html = await response.text();
          const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
          const title = titleMatch ? titleMatch[1].toLowerCase() : '';
          const bodyText = html.replace(/<[^>]+>/g, ' ').toLowerCase();
          const first2000 = bodyText.substring(0, 2000);

          // Check for common "not found" signals in title or early content
          const soft404Patterns = [
            /page\s*(not|no)\s*found/i,
            /404\s*(error|not found|page)/i,
            /not\s*found/i,
            /does\s*n.t\s*exist/i,
            /no\s*longer\s*(available|exists)/i,
            /página\s*no\s*encontrada/i,
          ];

          const titleIs404 = soft404Patterns.some(p => p.test(title));
          const contentIs404 = soft404Patterns.some(p => p.test(first2000));

          // Only flag as soft 404 if title clearly says 404/not found
          // OR if body content is very short (< 500 chars) and has "not found" pattern
          if (titleIs404 || (contentIs404 && first2000.trim().length < 500)) {
            return {
              url,
              statusCode: code,
              statusLabel: 'Soft 404',
              category: 'client-error',
              redirected: wasRedirected,
              finalUrl: wasRedirected ? finalUrl : null,
            };
          }
        } catch {
          // If we can't read body, just report the status code as-is
        }
      }

      return {
        url,
        statusCode: code,
        statusLabel: getStatusLabel(code, wasRedirected),
        category: getStatusCategory(code),
        redirected: wasRedirected,
        finalUrl: wasRedirected ? finalUrl : null,
      };
    } catch (error) {
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        return { url, statusCode: 0, statusLabel: 'Timeout', category: 'error' };
      }
      return { url, statusCode: 0, statusLabel: 'Error', category: 'error' };
    }
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
