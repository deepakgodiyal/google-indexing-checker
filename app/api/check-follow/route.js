import * as cheerio from 'cheerio';

// ============================================
// Dofollow / Nofollow Checker - API Route
// ============================================
// Fetches each URL and checks:
// 1. <meta name="robots" content="nofollow"> tag
// 2. X-Robots-Tag header for nofollow
// 3. Overall page follow status
// ============================================

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function checkFollowStatus(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });

    if (!response.ok) {
      return { url, followStatus: 'Error', detail: `HTTP ${response.status}` };
    }

    // Check 1: X-Robots-Tag header
    const xRobotsTag = response.headers.get('x-robots-tag') || '';
    if (xRobotsTag.toLowerCase().includes('nofollow')) {
      return { url, followStatus: 'Nofollow', source: 'X-Robots-Tag header' };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Check 2: <meta name="robots" content="...nofollow...">
    let isNofollow = false;
    let source = '';

    $('meta[name="robots"], meta[name="ROBOTS"]').each((_, el) => {
      const content = ($(el).attr('content') || '').toLowerCase();
      if (content.includes('nofollow')) {
        isNofollow = true;
        source = 'Meta robots tag';
      }
    });

    if (isNofollow) {
      return { url, followStatus: 'Nofollow', source };
    }

    // Check 3: <meta name="googlebot" content="...nofollow...">
    $('meta[name="googlebot"], meta[name="Googlebot"]').each((_, el) => {
      const content = ($(el).attr('content') || '').toLowerCase();
      if (content.includes('nofollow')) {
        isNofollow = true;
        source = 'Googlebot meta tag';
      }
    });

    if (isNofollow) {
      return { url, followStatus: 'Nofollow', source };
    }

    // If none of the above, page is Dofollow (default)
    return { url, followStatus: 'Dofollow', source: 'Default (no nofollow found)' };
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return { url, followStatus: 'Error', detail: 'Request timed out' };
    }
    return { url, followStatus: 'Error', detail: error.message || 'Unknown error' };
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

    const results = [];
    for (let i = 0; i < urls.length; i++) {
      const result = await checkFollowStatus(urls[i]);
      results.push(result);

      if (i < urls.length - 1) {
        const delay = 200 + Math.random() * 300;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return Response.json({ results });
  } catch (error) {
    console.error('Follow Check API Error:', error);
    return Response.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
