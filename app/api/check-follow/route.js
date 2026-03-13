import * as cheerio from 'cheerio';

// ============================================
// Dofollow / Nofollow Checker - API Route
// ============================================
// Fetches each URL and checks:
// 1. X-Robots-Tag header for nofollow
// 2. <meta name="robots" content="nofollow"> tag
// 3. <meta name="googlebot" content="nofollow"> tag
// 4. rel="nofollow" / rel="ugc" / rel="sponsored" on <a> tags
// Features: 30s timeout + auto-retry (up to 3 attempts)
// ============================================

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Extract domain from URL
function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

// Fetch with retry logic - tries up to 3 times
async function fetchWithRetry(url, maxRetries = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(30000), // 30 seconds timeout
        redirect: 'follow',
      });

      return response;
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt}/${maxRetries} failed for ${url}: ${error.message}`);

      // Wait before retrying (increasing delay: 2s, 4s)
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }
  }

  throw lastError;
}

async function checkFollowStatus(url) {
  try {
    const response = await fetchWithRetry(url);

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

    // Check 4: Check rel="nofollow" on actual <a> tags (outbound links)
    const pageDomain = getDomain(url);
    let totalOutboundLinks = 0;
    let nofollowLinks = 0;

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';

      // Skip anchors, javascript:, mailto:, tel:, empty hrefs
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      // Check if it's an outbound (external) link
      let linkDomain = '';
      try {
        if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
          const fullUrl = href.startsWith('//') ? 'https:' + href : href;
          linkDomain = getDomain(fullUrl);
        } else {
          // Relative link - skip (internal link)
          return;
        }
      } catch {
        return;
      }

      // Skip internal links (same domain)
      if (linkDomain === pageDomain) {
        return;
      }

      // This is an outbound/external link
      totalOutboundLinks++;

      // Check for nofollow-type rel attributes
      const rel = ($(el).attr('rel') || '').toLowerCase();
      if (rel.includes('nofollow') || rel.includes('ugc') || rel.includes('sponsored')) {
        nofollowLinks++;
      }
    });

    // Determine follow status based on outbound link analysis
    if (totalOutboundLinks > 0) {
      const nofollowPercentage = (nofollowLinks / totalOutboundLinks) * 100;

      // If more than 50% of outbound links are nofollow, mark page as Nofollow
      if (nofollowPercentage > 50) {
        return {
          url,
          followStatus: 'Nofollow',
          source: `${nofollowLinks}/${totalOutboundLinks} outbound links have rel=nofollow`,
        };
      }

      return {
        url,
        followStatus: 'Dofollow',
        source: `${totalOutboundLinks - nofollowLinks}/${totalOutboundLinks} outbound links are dofollow`,
      };
    }

    // If no outbound links found, default to Dofollow
    return { url, followStatus: 'Dofollow', source: 'No outbound links found (default dofollow)' };
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return { url, followStatus: 'Error', detail: 'Request timed out (after 3 retries)' };
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
