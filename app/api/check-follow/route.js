import * as cheerio from 'cheerio';

// ============================================
// Dofollow / Nofollow Checker - API Route
// ============================================
// Smart detection: Focuses on CONTENT AREA links
// (where backlinks are placed), not nav/footer links
//
// Checks:
// 1. X-Robots-Tag header for nofollow
// 2. <meta name="robots" content="nofollow"> tag
// 3. <meta name="googlebot" content="nofollow"> tag
// 4. rel="nofollow" on links in content/body area
// 5. Fallback: checks ALL outbound links
// Features: 30s timeout + auto-retry (3 attempts)
// ============================================

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

// Common CSS selectors for content/body area of blog posts
const CONTENT_SELECTORS = [
  'article',
  '.post-content',
  '.blog-content',
  '.entry-content',
  '.post-body',
  '.blog-body',
  '.article-content',
  '.article-body',
  '.content-body',
  '.single-content',
  '.page-content',
  '.read-blog',
  '.blog-post',
  '.post-text',
  '.story-body',
  '.w-blog-content',
  '.blog_description',
  '.blog-description',
  '.post_content',
  '.text-content',
  '.main-content',
  '#content',
  '#post-content',
  '#article-body',
  'main article',
  'main .content',
  '.wpb_wrapper',
  '.td-post-content',
  '.entry',
  '.post',
  '[role="article"]',
  '[itemprop="articleBody"]',
  '[itemprop="text"]',
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

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }
  }

  throw lastError;
}

// Check outbound links in a specific element/container
function analyzeLinks($, container, pageDomain) {
  let totalOutbound = 0;
  let nofollowCount = 0;

  const links = container ? $(container).find('a[href]') : $('a[href]');

  links.each((_, el) => {
    const href = ($(el).attr('href') || '').trim();

    // Skip non-http links
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }

    // Check if it's an external link
    let linkDomain = '';
    try {
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
        const fullUrl = href.startsWith('//') ? 'https:' + href : href;
        linkDomain = getDomain(fullUrl);
      } else {
        return; // Relative link = internal
      }
    } catch {
      return;
    }

    if (linkDomain === pageDomain) {
      return; // Same domain = internal
    }

    totalOutbound++;

    const rel = ($(el).attr('rel') || '').toLowerCase();
    if (rel.includes('nofollow') || rel.includes('ugc') || rel.includes('sponsored')) {
      nofollowCount++;
    }
  });

  return { totalOutbound, nofollowCount };
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

    const pageDomain = getDomain(url);

    // ====================================================
    // Check 4: SMART CONTENT AREA DETECTION
    // First try to find the content/body area of the page
    // and check links ONLY within that area
    // ====================================================

    let contentContainer = null;

    for (const selector of CONTENT_SELECTORS) {
      const el = $(selector);
      if (el.length > 0) {
        // Make sure this container actually has some content (not just an empty div)
        const text = el.text().trim();
        if (text.length > 100) {
          contentContainer = selector;
          break;
        }
      }
    }

    if (contentContainer) {
      // Found content area - check links within it
      const contentLinks = analyzeLinks($, contentContainer, pageDomain);

      if (contentLinks.totalOutbound > 0) {
        // If ANY link in content area has nofollow, the page is Nofollow for backlinks
        if (contentLinks.nofollowCount > 0) {
          return {
            url,
            followStatus: 'Nofollow',
            source: `${contentLinks.nofollowCount}/${contentLinks.totalOutbound} content links have rel=nofollow`,
          };
        }

        return {
          url,
          followStatus: 'Dofollow',
          source: `${contentLinks.totalOutbound} content links are dofollow`,
        };
      }
    }

    // ====================================================
    // Check 5: FALLBACK - Check ALL outbound links
    // If no content area found, check entire page
    // But use a LOWER threshold - if ANY link has nofollow
    // ====================================================

    const allLinks = analyzeLinks($, null, pageDomain);

    if (allLinks.totalOutbound > 0) {
      // If any outbound link has nofollow, likely the site adds nofollow to user links
      if (allLinks.nofollowCount > 0) {
        return {
          url,
          followStatus: 'Nofollow',
          source: `${allLinks.nofollowCount}/${allLinks.totalOutbound} outbound links have rel=nofollow`,
        };
      }

      return {
        url,
        followStatus: 'Dofollow',
        source: `All ${allLinks.totalOutbound} outbound links are dofollow`,
      };
    }

    // No outbound links found at all
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
