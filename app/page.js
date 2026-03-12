'use client';

import { useState, useCallback } from 'react';

// ==========================================
// HEADER COMPONENT
// ==========================================
function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <a href="/" className="logo">
          <div className="logo-icon">GIC</div>
          <div className="logo-text">
            Google <span>Index Checker</span>
          </div>
        </a>
        <div className="header-badge">SEO Tool v1.0</div>
      </div>
    </header>
  );
}

// ==========================================
// HERO SECTION
// ==========================================
function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1>
          Bulk <span>Google Index</span> Checker
        </h1>
        <p>
          Paste your URLs below and instantly check whether Google has indexed
          them. Supports up to 100 URLs at once with detailed status reports.
        </p>
      </div>
    </section>
  );
}

// ==========================================
// STATS CARDS
// ==========================================
function StatsCards({ results }) {
  const indexed = results.filter((r) => r.status === 'Indexed').length;
  const notIndexed = results.filter((r) => r.status === 'Not Indexed').length;
  const total = results.length;

  return (
    <div className="stats-grid">
      <div className="stat-card indexed">
        <div className="stat-number">{indexed}</div>
        <div className="stat-label">Indexed</div>
      </div>
      <div className="stat-card not-indexed">
        <div className="stat-number">{notIndexed}</div>
        <div className="stat-label">Not Indexed</div>
      </div>
      <div className="stat-card total">
        <div className="stat-number">{total}</div>
        <div className="stat-label">Total Checked</div>
      </div>
    </div>
  );
}

// ==========================================
// RESULTS TABLE
// ==========================================
function ResultsTable({ results, filter, setFilter }) {
  const filteredResults =
    filter === 'all'
      ? results
      : filter === 'indexed'
      ? results.filter((r) => r.status === 'Indexed')
      : results.filter((r) => r.status === 'Not Indexed');

  const getStatusClass = (status) => {
    switch (status) {
      case 'Indexed':
        return 'indexed';
      case 'Not Indexed':
        return 'not-indexed';
      case 'Checking...':
        return 'checking';
      default:
        return 'error';
    }
  };

  return (
    <div className="results-card">
      <div className="results-header">
        <div className="results-title">Results ({filteredResults.length})</div>
        <div className="results-actions">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'indexed' ? 'active' : ''}`}
            onClick={() => setFilter('indexed')}
          >
            Indexed
          </button>
          <button
            className={`filter-btn ${filter === 'not-indexed' ? 'active' : ''}`}
            onClick={() => setFilter('not-indexed')}
          >
            Not Indexed
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="results-table">
          <thead>
            <tr>
              <th>#</th>
              <th>URL</th>
              <th>Status</th>
              <th>Google Search</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan="4">
                  <div className="empty-state">
                    <p>No results to display for this filter.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredResults.map((result, index) => (
                <tr key={result.url + index}>
                  <td className="row-number">{index + 1}</td>
                  <td className="url-cell" title={result.url}>
                    {result.url}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${getStatusClass(result.status)}`}
                    >
                      <span
                        className={`status-dot ${getStatusClass(result.status)}`}
                      ></span>
                      {result.status}
                    </span>
                  </td>
                  <td>
                    <a
                      href={`https://www.google.com/search?q=site:${encodeURIComponent(result.url)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="google-link"
                    >
                      Check on Google ↗
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// FOOTER
// ==========================================
function Footer() {
  return (
    <footer className="footer">
      <p>
        Google Indexing Checker &mdash; A free SEO tool to verify URL index
        status.
      </p>
    </footer>
  );
}

// ==========================================
// CSV EXPORT UTILITY
// ==========================================
function exportCSV(results) {
  const header = 'URL,Status,Google Search Link\n';
  const rows = results
    .map(
      (r) =>
        `"${r.url}","${r.status}","https://www.google.com/search?q=site:${encodeURIComponent(r.url)}"`
    )
    .join('\n');
  const csvContent = header + rows;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `index-check-results-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function Home() {
  const [urls, setUrls] = useState('');
  const [results, setResults] = useState([]);
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  // Count URLs in the textarea
  const urlCount = urls
    .split('\n')
    .filter((line) => line.trim().length > 0).length;

  // -----------------------------------------
  // Main check handler
  // -----------------------------------------
  const handleCheck = useCallback(async () => {
    setError('');

    // Parse and validate URLs
    const urlList = urls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urlList.length === 0) {
      setError('Please paste at least one URL to check.');
      return;
    }

    if (urlList.length > 100) {
      setError('Maximum 100 URLs allowed per check. Please reduce the list.');
      return;
    }

    setIsChecking(true);
    setResults([]);
    setFilter('all');
    setProgress({ current: 0, total: urlList.length });

    // Initialize results with "Checking..." status
    const initialResults = urlList.map((url) => ({
      url,
      status: 'Checking...',
    }));
    setResults(initialResults);

    // Process in batches of 5 with a delay between batches
    const BATCH_SIZE = 5;
    const updatedResults = [...initialResults];

    for (let i = 0; i < urlList.length; i += BATCH_SIZE) {
      const batch = urlList.slice(i, i + BATCH_SIZE);

      try {
        const response = await fetch('/api/check-index', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: batch }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Server error: ${response.status}`
          );
        }

        const data = await response.json();

        // Update the results array with this batch's results
        data.results.forEach((result, idx) => {
          updatedResults[i + idx] = result;
        });

        setResults([...updatedResults]);
        setProgress({ current: Math.min(i + BATCH_SIZE, urlList.length), total: urlList.length });
      } catch (err) {
        // Mark remaining batch items as errors
        batch.forEach((url, idx) => {
          updatedResults[i + idx] = {
            url,
            status: 'Error',
          };
        });
        setResults([...updatedResults]);
        setProgress({ current: Math.min(i + BATCH_SIZE, urlList.length), total: urlList.length });
      }

      // Add a small delay between batches to be respectful of rate limits
      if (i + BATCH_SIZE < urlList.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    setIsChecking(false);
  }, [urls]);

  // -----------------------------------------
  // Check if we have final results to show
  // -----------------------------------------
  const hasResults =
    results.length > 0 &&
    results.some((r) => r.status !== 'Checking...');

  return (
    <>
      <Header />
      <Hero />

      <main className="main-container">
        {/* URL Input Card */}
        <div className="input-card">
          <div className="input-card-header">
            <div className="input-card-title">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Enter URLs to Check
            </div>
            <div className="url-count-badge">
              {urlCount} URL{urlCount !== 1 ? 's' : ''} entered
            </div>
          </div>

          <div className="textarea-wrapper">
            <textarea
              className="url-textarea"
              placeholder={`Paste your URLs here (one per line)...\n\nExample:\nhttps://example.com/page-1\nhttps://example.com/page-2\nhttps://example.com/page-3`}
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              disabled={isChecking}
            />
          </div>

          {error && (
            <div
              style={{
                color: 'var(--error-red)',
                fontSize: '14px',
                marginBottom: '16px',
                padding: '10px 16px',
                background: 'rgba(255, 23, 68, 0.06)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 23, 68, 0.15)',
              }}
            >
              {error}
            </div>
          )}

          <div className="button-row">
            <button
              className="btn-primary"
              onClick={handleCheck}
              disabled={isChecking || urlCount === 0}
            >
              {isChecking ? (
                <>
                  <span className="spinner"></span>
                  Checking...
                </>
              ) : (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Check Index Status
                </>
              )}
            </button>

            {hasResults && (
              <button
                className="btn-secondary"
                onClick={() => exportCSV(results)}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export CSV
              </button>
            )}

            {results.length > 0 && !isChecking && (
              <button
                className="btn-secondary"
                onClick={() => {
                  setResults([]);
                  setProgress({ current: 0, total: 0 });
                  setFilter('all');
                }}
              >
                Clear Results
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {isChecking && progress.total > 0 && (
          <div className="progress-section">
            <div className="progress-header">
              <span className="progress-text">Checking URLs...</span>
              <span className="progress-count">
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {hasResults && <StatsCards results={results} />}

        {/* Results Table */}
        {results.length > 0 && (
          <ResultsTable
            results={results}
            filter={filter}
            setFilter={setFilter}
          />
        )}
      </main>

      <Footer />
    </>
  );
}
