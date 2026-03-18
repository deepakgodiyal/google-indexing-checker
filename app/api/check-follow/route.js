import * as cheerio from 'cheerio';

// ============================================
// Dofollow / Nofollow Checker - API Route
// ============================================
// Smart detection: Focuses on CONTENT AREA links
// Optimized for Vercel: parallel processing, 60s max
// ============================================

// Allow up to 60 seconds on Vercel (Hobby plan max)
export const maxDuration = 60;

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

function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

// Extract clean domain from any input (full URL or just domain)
function cleanDomain(input) {
  if (!input) return '';
  let cleaned = input.trim().toLowerCase();
  // Remove protocol
  cleaned = cleaned.replace(/^https?:\/\//, '');
  // Remove www.
  cleaned = cleaned.replace(/^www\./, '');
  // Remove trailing slash and path
  cleaned = cleaned.replace(/\/.*$/, '');
  return cleaned;
}

// Fetch with retry - 2 attempts, 15s timeout each
async function fetchWithRetry(url) {
  const maxAttempts = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(15000), // 15 seconds per attempt
        redirect: 'follow',
      });
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000)); // 1s wait before retry
      }
    }
  }
  throw lastError;
}

// Check outbound links in a specific element/container
function analyzeLinks($, container, pageDomain, targetDomain) {
  let totalOutbound = 0;
  let nofollowCount = 0;

  const links = container ? $(container).find('a[href]') : $('a[href]');
  const normalizedTarget = targetDomain ? cleanDomain(targetDomain) : '';

  links.each((_, el) => {
    const href = ($(el).attr('href') || '').trim();

    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }

    let linkDomain = '';
    try {
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
        const fullUrl = href.startsWith('//') ? 'https:' + href : href;
        linkDomain = getDomain(fullUrl);
      } else {
        return;
      }
    } catch {
      return;
    }

    // Skip internal links (same domain as page)
    if (linkDomain === pageDomain) {
      return;
    }

    // If targetDomain is set, ONLY count links pointing to target domain
    if (normalizedTarget) {
      const linkDomainLower = linkDomain.toLowerCase();
      if (linkDomainLower !== normalizedTarget && !linkDomainLower.endsWith('.' + normalizedTarget)) {
        return; // Skip links NOT pointing to target domain
      }
    }

    totalOutbound++;

    const rel = ($(el).attr('rel') || '').toLowerCase();
    if (rel.includes('nofollow') || rel.includes('ugc') || rel.includes('sponsored')) {
      nofollowCount++;
    }
  });

  return { totalOutbound, nofollowCount };
}

// Targeted domain check - searches ENTIRE page for links to specific domain
function analyzeTargetedLinks($, targetDomain) {
  const normalizedTarget = cleanDomain(targetDomain);
  let targetLinksFound = 0;
  let targetNofollowCount = 0;

  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') || '').trim();
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }

    let linkDomain = '';
    try {
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
        const fullUrl = href.startsWith('//') ? 'https:' + href : href;
        linkDomain = getDomain(fullUrl).toLowerCase();
      } else {
        return;
      }
    } catch {
      return;
    }

    if (linkDomain === normalizedTarget || linkDomain.endsWith('.' + normalizedTarget)) {
      targetLinksFound++;
      const rel = ($(el).attr('rel') || '').toLowerCase();
      if (rel.includes('nofollow') || rel.includes('ugc') || rel.includes('sponsored')) {
        targetNofollowCount++;
      }
    }
  });

  return { targetLinksFound, targetNofollowCount };
}

async function checkFollowStatus(url, targetDomain) {
  try {
    const response = await fetchWithRetry(url);

    if (!response.ok) {
      return { url, followStatus: 'Error', detail: `HTTP ${response.status}` };
    }

    // Check 1: X-Robots-Tag header (page-level nofollow)
    const xRobotsTag = response.headers.get('x-robots-tag') || '';
    if (xRobotsTag.toLowerCase().includes('nofollow')) {
      return { url, followStatus: 'Nofollow', source: 'X-Robots-Tag header' };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Check 2: <meta name="robots" content="...nofollow..."> (page-level)
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

    // Check 3: <meta name="googlebot" content="...nofollow..."> (page-level)
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

    // ===== TARGET DOMAIN MODE =====
    // If targetDomain is set, search ENTIRE page for links pointing to that domain
    if (targetDomain) {
      const targeted = analyzeTargetedLinks($, targetDomain);

      if (targeted.targetLinksFound > 0) {
        // If ANY link to target is nofollow → Nofollow
        if (targeted.targetNofollowCount > 0) {
          return {
            url,
            followStatus: 'Nofollow',
            source: `${targeted.targetNofollowCount}/${targeted.targetLinksFound} links to ${targetDomain} have rel=nofollow`,
          };
        }
        return {
          url,
          followStatus: 'Dofollow',
          source: `${targeted.targetLinksFound} links to ${targetDomain} are all dofollow`,
        };
      }

      return { url, followStatus: 'No Link Found', source: `No links to ${targetDomain} found on this page` };
    }

    // ===== OLD BEHAVIOR (no target domain) =====
    const pageDomain = getDomain(url);

    // Check 4: SMART CONTENT AREA DETECTION
    let contentContainer = null;

    for (const selector of CONTENT_SELECTORS) {
      const el = $(selector);
      if (el.length > 0) {
        const text = el.text().trim();
        if (text.length > 100) {
          contentContainer = selector;
          break;
        }
      }
    }

    if (contentContainer) {
      const contentLinks = analyzeLinks($, contentContainer, pageDomain, '');

      if (contentLinks.totalOutbound > 0) {
        const nofollowPct = (contentLinks.nofollowCount / contentLinks.totalOutbound) * 100;

        if (nofollowPct > 50) {
          return {
            url,
            followStatus: 'Nofollow',
            source: `${contentLinks.nofollowCount}/${contentLinks.totalOutbound} content links have rel=nofollow`,
          };
        }

        return {
          url,
          followStatus: 'Dofollow',
          source: `${contentLinks.totalOutbound - contentLinks.nofollowCount}/${contentLinks.totalOutbound} content links are dofollow`,
        };
      }
    }

    // Check 5: FALLBACK - Check ALL outbound links
    const allLinks = analyzeLinks($, null, pageDomain, '');

    if (allLinks.totalOutbound > 0) {
      const nofollowPct = (allLinks.nofollowCount / allLinks.totalOutbound) * 100;

      if (nofollowPct > 50) {
        return {
          url,
          followStatus: 'Nofollow',
          source: `${allLinks.nofollowCount}/${allLinks.totalOutbound} outbound links have rel=nofollow`,
        };
      }

      return {
        url,
        followStatus: 'Dofollow',
        source: `${allLinks.totalOutbound - allLinks.nofollowCount}/${allLinks.totalOutbound} outbound links are dofollow`,
      };
    }

    return { url, followStatus: 'Dofollow', source: 'No outbound links found (default dofollow)' };
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return { url, followStatus: 'Error', detail: 'Site not accessible from server' };
    }
    return { url, followStatus: 'Error', detail: error.message || 'Unknown error' };
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { urls, targetDomain } = body;

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

    // Process ALL URLs in PARALLEL (not one-by-one) for speed
    const results = await Promise.all(
      urls.map((url) => checkFollowStatus(url, targetDomain || ''))
    );

    return Response.json({ results });
  } catch (error) {
    console.error('Follow Check API Error:', error);
    return Response.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
