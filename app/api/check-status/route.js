// ============================================
// HTTP Status Code Checker - API Route
// ============================================
// Follows ALL redirects and returns FINAL status code
// e.g. URL → 302 → 302 → 404 = shows "404 Not Found"
// ============================================

// Allow up to 60 seconds on Vercel (Hobby plan max)
export const maxDuration = 60;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
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
        const ua = getRandomUserAgent();
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': ua,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'Connection': 'keep-alive',
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
          const first3000 = bodyText.substring(0, 3000);

          // Patterns for title (strict match)
          const title404Patterns = [
            /404/,
            /not\s*found/,
            /page\s*(not|no)\s*found/,
            /error/,
            /página\s*no\s*encontrada/,
            /không\s*tìm\s*thấy/,
            /tidak\s*ditemukan/,
          ];

          // Patterns for body content (broader match)
          const body404Patterns = [
            /page\s*(not|no|can.t be)\s*found/,
            /404\s*(error|not found|page)?/,
            /this\s*page\s*(doesn.t|does not|could not)\s*(exist|be found)/,
            /no\s*longer\s*(available|exists|found)/,
            /content\s*(not|no)\s*(found|available)/,
            /removed\s*or\s*deleted/,
            /doesn.t\s*exist/,
            /does\s*not\s*exist/,
            /página\s*no\s*encontrada/,
            /the\s*requested\s*(url|page|resource)\s*(was|is)?\s*not\s*found/,
            /sorry.*page.*not.*found/,
            /oops.*not.*found/,
            /we\s*couldn.t\s*find/,
            /không\s*tìm\s*thấy/,
            /bài\s*viết\s*không\s*tồn\s*tại/,
          ];

          const titleIs404 = title404Patterns.some(p => p.test(title));
          const contentIs404 = body404Patterns.some(p => p.test(first3000));

          // Flag as 404 if:
          // 1. Title clearly says 404/not found/error
          // 2. Body has "not found" pattern AND content is short (< 1500 chars = likely error page)
          // 3. Body has "not found" pattern AND title is generic/empty
          if (titleIs404 || (contentIs404 && first3000.trim().length < 1500) || (contentIs404 && title.length < 5)) {
            return {
              url,
              statusCode: code,
              statusLabel: '404 Not Found',
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
