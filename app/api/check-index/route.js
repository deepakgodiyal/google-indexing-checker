// ============================================
// Google Index Checker - API Route
// ============================================
// Uses Serper.dev API (free 2,500 searches)
// for reliable Google search results.
// ============================================

// Rate limiting: simple in-memory store
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry) {
    rateLimitMap.set(ip, { count: 1, startTime: now });
    return false;
  }

  if (now - entry.startTime > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, startTime: now });
    return false;
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  entry.count++;
  return false;
}

// ============================================
// Check if a URL is indexed using Serper.dev
// ============================================
async function checkGoogleIndex(url, apiKey) {
  const query = `site:${url}`;

  // Extract domain for matching
  const cleanUrl = url.replace(/https?:\/\//, '').replace(/\/+$/, '');
  const domain = cleanUrl.split('/')[0].toLowerCase();

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: 10,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (response.status === 401 || response.status === 403) {
      return { url, status: 'Error', detail: 'Invalid API key. Check your SERPER_API_KEY.' };
    }

    if (response.status === 429) {
      return { url, status: 'Error', detail: 'API rate limit reached. Try again later.' };
    }

    if (!response.ok) {
      return { url, status: 'Error', detail: `API error: ${response.status}` };
    }

    const data = await response.json();

    // Check organic results for the domain
    const organicResults = data.organic || [];

    // Check if any organic result link contains the domain
    const domainFound = organicResults.some((result) => {
      const resultLink = (result.link || '').toLowerCase();
      return resultLink.includes(domain);
    });

    if (domainFound) {
      return { url, status: 'Indexed' };
    }

    // Also check if searchInformation shows zero results
    const totalResults = data.searchInformation?.totalResults;
    if (totalResults === '0' || totalResults === 0) {
      return { url, status: 'Not Indexed' };
    }

    // If organic results exist but domain not found
    // (shouldn't happen with site: query, but just in case)
    if (organicResults.length === 0) {
      return { url, status: 'Not Indexed' };
    }

    // Default: not indexed
    return { url, status: 'Not Indexed' };
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return { url, status: 'Error', detail: 'Request timed out' };
    }
    return { url, status: 'Error', detail: error.message || 'Unknown error' };
  }
}

// ============================================
// POST handler
// ============================================
export async function POST(request) {
  try {
    // Get client IP for rate limiting
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';

    if (isRateLimited(ip)) {
      return Response.json(
        { error: 'Rate limit exceeded. Please wait a moment before trying again.' },
        { status: 429 }
      );
    }

    // Check for API key
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'SERPER_API_KEY is not configured. Please add it to your .env.local file.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { urls } = body;

    // Validate input
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return Response.json(
        { error: 'Please provide an array of URLs to check.' },
        { status: 400 }
      );
    }

    if (urls.length > 10) {
      return Response.json(
        { error: 'Maximum 10 URLs per batch. Send smaller batches.' },
        { status: 400 }
      );
    }

    // Check each URL with a small delay between requests
    const results = [];
    for (let i = 0; i < urls.length; i++) {
      const result = await checkGoogleIndex(urls[i], apiKey);
      results.push(result);

      // Small delay between requests
      if (i < urls.length - 1) {
        const delay = 300 + Math.random() * 400;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return Response.json({ results });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
