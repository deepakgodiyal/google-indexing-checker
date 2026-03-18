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
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
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
        signal: AbortSignal.timeout(15000),
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
  let targetDofollowCount = 0;

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
      // Handle malformed URLs - check if href text contains the target domain
      const hrefLower = href.toLowerCase();
      if (hrefLower.includes(normalizedTarget)) {
        targetLinksFound++;
        const rel = ($(el).attr('rel') || '').toLowerCase();
        if (rel.includes('nofollow') || rel.includes('ugc') || rel.includes('sponsored')) {
          targetNofollowCount++;
        } else {
          targetDofollowCount++;
        }
      }
      return;
    }

    if (linkDomain === normalizedTarget || linkDomain.endsWith('.' + normalizedTarget)) {
      targetLinksFound++;
      const rel = ($(el).attr('rel') || '').toLowerCase();
      if (rel.includes('nofollow') || rel.includes('ugc') || rel.includes('sponsored')) {
        targetNofollowCount++;
      } else {
        targetDofollowCount++;
      }
    }
  });

  // Also check anchor text and surrounding text for target domain mentions with links
  $('a').each((_, el) => {
    const href = ($(el).attr('href') || '').trim();
    const text = ($(el).text() || '').trim().toLowerCase();

    // Skip if already counted or no href
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    // Check if link text or href contains target domain (catches malformed URLs)
    if ((text.includes(normalizedTarget) || href.toLowerCase().includes(normalizedTarget)) && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
      // Only count if not already counted by URL matching above
      let alreadyCounted = false;
      try {
        if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
          const fullUrl = href.startsWith('//') ? 'https:' + href : href;
          const ld = getDomain(fullUrl).toLowerCase();
          if (ld === normalizedTarget || ld.endsWith('.' + normalizedTarget)) {
            alreadyCounted = true;
          }
        }
      } catch {
        // malformed URL - might have been counted in catch block above
        if (href.toLowerCase().includes(normalizedTarget)) {
          alreadyCounted = true;
        }
      }

      if (!alreadyCounted && text.includes(normalizedTarget)) {
        targetLinksFound++;
        const rel = ($(el).attr('rel') || '').toLowerCase();
        if (rel.includes('nofollow') || rel.includes('ugc') || rel.includes('sponsored')) {
          targetNofollowCount++;
        } else {
          targetDofollowCount++;
        }
      }
    }
  });

  return { targetLinksFound, targetNofollowCount, targetDofollowCount };
}

async function checkFollowStatus(url, targetDomain) {
  try {
    // If URL domain matches target domain, skip check (checking own site is meaningless)
    if (targetDomain) {
      const urlDomain = getDomain(url).toLowerCase();
      const normalizedTarget = cleanDomain(targetDomain);
      if (urlDomain === normalizedTarget || urlDomain.endsWith('.' + normalizedTarget) || normalizedTarget.endsWith('.' + urlDomain)) {
        return { url, followStatus: 'Same Domain', source: 'URL belongs to your own target domain - only check external/third-party URLs' };
      }
    }

    const response = await fetchWithRetry(url);

    if (!response.ok) {
      return { url, followStatus: 'Error', detail: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // ===== TARGET DOMAIN MODE =====
    // If targetDomain is set, FIRST check if links to target exist
    // Only then check page-level nofollow (meta robots, x-robots-tag)
    if (targetDomain) {
      const targeted = analyzeTargetedLinks($, targetDomain);

      // If NO links to target domain found, return "No Link Found" immediately
      // regardless of page-level nofollow settings
      if (targeted.targetLinksFound === 0) {
        return { url, followStatus: 'No Link Found', source: `No links to ${targetDomain} found on this page` };
      }

      // Links to target domain exist - now check page-level nofollow
      // Page-level nofollow means ALL links on the page are nofollow
      const xRobotsTag = response.headers.get('x-robots-tag') || '';
      if (xRobotsTag.toLowerCase().includes('nofollow')) {
        return { url, followStatus: 'Nofollow', source: 'X-Robots-Tag header (page-level nofollow)' };
      }

      let pageNofollow = false;
      $('meta[name="robots"], meta[name="ROBOTS"]').each((_, el) => {
        const content = ($(el).attr('content') || '').toLowerCase();
        if (content.includes('nofollow')) pageNofollow = true;
      });
      $('meta[name="googlebot"], meta[name="Googlebot"]').each((_, el) => {
        const content = ($(el).attr('content') || '').toLowerCase();
        if (content.includes('nofollow')) pageNofollow = true;
      });

      if (pageNofollow) {
        return { url, followStatus: 'Nofollow', source: 'Page-level meta nofollow (all links on page are nofollow)' };
      }

      // Check individual link rel attributes
      // SEO Logic: If ANY link to target domain is dofollow, that page passes link juice
      // So: any dofollow = Dofollow result. Only ALL nofollow = Nofollow result.
      if (targeted.targetDofollowCount > 0) {
        return {
          url,
          followStatus: 'Dofollow',
          source: `${targeted.targetDofollowCount}/${targeted.targetLinksFound} links to ${targetDomain} are dofollow`,
        };
      }
      return {
        url,
        followStatus: 'Nofollow',
        source: `All ${targeted.targetNofollowCount} links to ${targetDomain} have rel=nofollow`,
      };
    }

    // ===== NO TARGET DOMAIN MODE =====
    // Check page-level nofollow first
    const xRobotsTag = response.headers.get('x-robots-tag') || '';
    if (xRobotsTag.toLowerCase().includes('nofollow')) {
      return { url, followStatus: 'Nofollow', source: 'X-Robots-Tag header' };
    }

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
