'use client';

import { useState, useCallback, useEffect } from 'react';
import { setUserOnline, setUserOffline, listenOnlineUsers } from './lib/firebase';

// ==========================================
// HEADER COMPONENT
// ==========================================
function Header({ userName, onSettingsClick, onlineUsers, showOnlinePanel, setShowOnlinePanel }) {
  return (
    <header className="header">
      <div className="header-inner">
        <a href="/" className="logo">
          <div className="logo-icon">GIC</div>
          <div className="logo-text">
            Google <span>Index Checker</span>
          </div>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Online Users Button */}
          <div className="online-btn-wrapper">
            <button
              className="online-btn"
              onClick={() => setShowOnlinePanel(!showOnlinePanel)}
              title="Online Users"
            >
              <span className="online-dot-pulse"></span>
              <span>{onlineUsers.length} Online</span>
            </button>

            {/* Dropdown Panel */}
            {showOnlinePanel && (
              <div className="online-panel">
                <div className="online-panel-header">
                  <span className="online-panel-title">Online Users ({onlineUsers.length})</span>
                  <button className="online-panel-close" onClick={() => setShowOnlinePanel(false)}>✕</button>
                </div>
                <div className="online-panel-list">
                  {onlineUsers.length === 0 ? (
                    <div className="online-panel-empty">No one is online</div>
                  ) : (
                    onlineUsers.map((user) => (
                      <div key={user.id} className="online-user-item">
                        <span className="online-user-avatar">{user.name.charAt(0).toUpperCase()}</span>
                        <span className="online-user-name">{user.name}</span>
                        <span className="online-user-dot"></span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {userName && (
            <div className="user-badge">
              <span className="user-avatar">{userName.charAt(0).toUpperCase()}</span>
              {userName}
            </div>
          )}
          <button className="settings-btn" onClick={onSettingsClick} title="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

// ==========================================
// SETTINGS MODAL
// ==========================================
function SettingsModal({ isOpen, onClose, userName, apiKey, targetDomain, onSave }) {
  const [name, setName] = useState(userName);
  const [key, setKey] = useState(apiKey);
  const [domain, setDomain] = useState(targetDomain);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(userName);
    setKey(apiKey);
    setDomain(targetDomain);
    setSaved(false);
  }, [isOpen, userName, apiKey, targetDomain]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter your name.');
      return;
    }
    if (!key.trim()) {
      alert('Please enter your Serper.dev API key.');
      return;
    }
    onSave(name.trim(), key.trim(), cleanDomainInput(domain));
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </h2>
          <button className="modal-close" onClick={onClose}>X</button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            Enter your name, Serper.dev API key, and your target domain for backlink checking. Get your free API key at{' '}
            <a href="https://serper.dev" target="_blank" rel="noopener noreferrer">serper.dev</a>{' '}
            (2,500 free searches per account).
          </p>

          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Vishal Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Serper.dev API Key</label>
            <input
              type="text"
              className="form-input"
              placeholder="Paste your API key here..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Target Domain (for Dofollow/Nofollow check)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. expertmarketresearch.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onBlur={(e) => setDomain(cleanDomainInput(e.target.value))}
              autoComplete="off"
            />
            <p style={{ fontSize: '12px', color: '#8892a4', marginTop: '6px', lineHeight: '1.5' }}>
              Enter only the domain name, e.g. <strong>expertmarketresearch.com</strong> (not the full URL). https:// and www will be removed automatically.
            </p>
          </div>

          <button
            className={`btn-primary ${saved ? 'btn-saved' : ''}`}
            onClick={handleSave}
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
          >
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SETUP SCREEN (shown when no API key)
// ==========================================
function SetupScreen({ onSave }) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [domain, setDomain] = useState('');

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter your name.');
      return;
    }
    if (!key.trim()) {
      alert('Please enter your Serper.dev API key.');
      return;
    }
    onSave(name.trim(), key.trim(), cleanDomainInput(domain));
  };

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <div className="setup-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <h2 className="setup-title">Welcome! Set Up Your SEO Tool</h2>
        <p className="setup-description">
          To use this tool, you need a free Serper.dev API key. Each key gets <strong>2,500 free searches</strong> per month.
        </p>

        <div className="setup-steps">
          <div className="setup-step">
            <span className="step-number">1</span>
            <span>Go to <a href="https://serper.dev" target="_blank" rel="noopener noreferrer">serper.dev</a> and sign up for free</span>
          </div>
          <div className="setup-step">
            <span className="step-number">2</span>
            <span>Copy your API key from the dashboard</span>
          </div>
          <div className="setup-step">
            <span className="step-number">3</span>
            <span>Paste it below and start checking URLs!</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Display Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Vishal Kumar"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            data-lpignore="true"
            data-form-type="other"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Serper.dev API Key</label>
          <input
            type="text"
            className="form-input"
            placeholder="Paste your API key here..."
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoComplete="off"
            data-lpignore="true"
            data-form-type="other"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Target Domain (for Dofollow/Nofollow check)</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. expertmarketresearch.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onBlur={(e) => setDomain(cleanDomainInput(e.target.value))}
            autoComplete="off"
          />
          <p style={{ fontSize: '12px', color: '#8892a4', marginTop: '6px', lineHeight: '1.5' }}>
            Enter only the domain name, e.g. <strong>expertmarketresearch.com</strong> (not the full URL). https:// and www will be removed automatically.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={handleSave}
          style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '16px 32px' }}
        >
          Save &amp; Start Using Tool
        </button>
      </div>
    </div>
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
          Paste your URLs below and instantly check Google index status plus
          Dofollow/Nofollow status. Supports up to 500 URLs at once.
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
  const dofollow = results.filter((r) => r.followStatus === 'Dofollow').length;
  const nofollow = results.filter((r) => r.followStatus === 'Nofollow').length;

  return (
    <div className="stats-grid-5">
      <div className="stat-card indexed">
        <div className="stat-number">{indexed}</div>
        <div className="stat-label">Indexed on Google</div>
      </div>
      <div className="stat-card not-indexed">
        <div className="stat-number">{notIndexed}</div>
        <div className="stat-label">Not Indexed on Google</div>
      </div>
      <div className="stat-card dofollow">
        <div className="stat-number">{dofollow}</div>
        <div className="stat-label">Dofollow</div>
      </div>
      <div className="stat-card nofollow">
        <div className="stat-number">{nofollow}</div>
        <div className="stat-label">Nofollow</div>
      </div>
      <div className="stat-card total">
        <div className="stat-number">{results.length}</div>
        <div className="stat-label">Total</div>
      </div>
    </div>
  );
}

// ==========================================
// RESULTS TABLE
// ==========================================
function ResultsTable({ results, filter, setFilter, onRecheckIndex, onRecheckStatus, onRecheckFollow, isChecking }) {
  const filteredResults =
    filter === 'all'
      ? results
      : filter === 'indexed'
      ? results.filter((r) => r.status === 'Indexed')
      : filter === 'not-indexed'
      ? results.filter((r) => r.status === 'Not Indexed')
      : filter === 'dofollow'
      ? results.filter((r) => r.followStatus === 'Dofollow')
      : results.filter((r) => r.followStatus === 'Nofollow');

  const getStatusClass = (status) => {
    switch (status) {
      case 'Indexed': return 'indexed';
      case 'Not Indexed': return 'not-indexed';
      case 'Checking...': return 'checking';
      default: return 'error';
    }
  };

  const getFollowClass = (followStatus) => {
    switch (followStatus) {
      case 'Dofollow': return 'dofollow';
      case 'Nofollow': return 'nofollow';
      case 'Checking...': return 'checking';
      case 'N/A': return 'na-status';
      case 'No Link Found': return 'na-status';
      case 'Same Domain': return 'same-domain';
      default: return 'error';
    }
  };

  const getStatusCodeClass = (statusCode) => {
    if (!statusCode || statusCode === 'Checking...') return 'checking';
    if (statusCode === 'Error' || statusCode === 'Timeout') return 'error';
    if (statusCode.startsWith('2')) return 'status-2xx';
    if (statusCode.startsWith('3')) return 'status-3xx';
    if (statusCode.startsWith('4')) return 'status-4xx';
    if (statusCode.startsWith('5')) return 'status-5xx';
    return 'error';
  };

  return (
    <div className="results-card">
      <div className="results-header">
        <div className="results-title">Results ({filteredResults.length})</div>
        <div className="results-actions">
          {['all', 'indexed', 'not-indexed', 'dofollow', 'nofollow'].map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'indexed' ? 'Indexed' : f === 'not-indexed' ? 'Not Indexed' : f === 'dofollow' ? 'Dofollow' : 'Nofollow'}
            </button>
          ))}
        </div>
      </div>
      <div className="table-container">
        <table className="results-table">
          <thead>
            <tr>
              <th style={{width:'30px'}}>#</th>
              <th style={{width:'28%'}}>URL</th>
              <th style={{whiteSpace:'nowrap'}}>Index on Google</th>
              <th style={{whiteSpace:'nowrap'}}>Status Code</th>
              <th style={{whiteSpace:'nowrap'}}>Follow/Nofollow</th>
              <th style={{whiteSpace:'nowrap'}}>Index/Noindex</th>
              <th style={{whiteSpace:'nowrap'}}>Google Search</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan="7">
                  <div className="empty-state"><p>No results to display for this filter.</p></div>
                </td>
              </tr>
            ) : (
              filteredResults.map((result, index) => {
                const originalIndex = results.findIndex(r => r.url === result.url);
                return (
                  <tr key={result.url + index}>
                    <td className="row-number">{index + 1}</td>
                    <td className="url-cell" title={result.url}><a href={result.url} target="_blank" rel="noopener noreferrer" className="url-link">{result.url}</a></td>
                    <td>
                      <div className="status-cell">
                        <button className={`recheck-btn ${isChecking || result.status === 'Checking...' || result.status === '-' ? 'recheck-hidden' : ''}`} onClick={() => onRecheckIndex(originalIndex)} title="Recheck Index Status" disabled={isChecking || result.status === 'Checking...'}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                        </button>
                        <span className={`status-badge ${getStatusClass(result.status)}`}>
                          <span className={`status-dot ${getStatusClass(result.status)}`}></span>
                          {result.status}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="status-cell">
                        <button className={`recheck-btn ${isChecking || result.statusCode === 'Checking...' || result.statusCode === '-' ? 'recheck-hidden' : ''}`} onClick={() => onRecheckStatus(originalIndex)} title="Recheck Status Code" disabled={isChecking || result.statusCode === 'Checking...'}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                        </button>
                        <div className="status-cell-content">
                          {result.redirectInfo && result.redirectInfo.statusCodes && result.redirectInfo.statusCodes.length > 0 ? (
                            (() => {
                              // Filter to show only redirect codes (301, 302, 303, 307, 308)
                              const redirectCodes = result.redirectInfo.statusCodes.filter(code => [301, 302, 303, 307, 308].includes(code));

                              if (redirectCodes.length > 0) {
                                return (
                                  <div className="status-codes-display" title={`Redirect codes: ${redirectCodes.join(' → ')}`}>
                                    {redirectCodes.map((code, idx) => (
                                      <span key={idx} className={`code-badge ${getStatusCodeClass(String(code))}`}>
                                        {code}
                                        {idx < redirectCodes.length - 1 && <span className="arrow"> → </span>}
                                      </span>
                                    ))}
                                  </div>
                                );
                              } else {
                                // If no redirect codes, show final status
                                return (
                                  <span className={`status-badge ${getStatusCodeClass(result.statusCode || 'Checking...')}`}>
                                    <span className={`status-dot ${getStatusCodeClass(result.statusCode || 'Checking...')}`}></span>
                                    {result.statusCode || 'Checking...'}
                                  </span>
                                );
                              }
                            })()
                          ) : (
                            <span className={`status-badge ${getStatusCodeClass(result.statusCode || 'Checking...')}`}>
                              <span className={`status-dot ${getStatusCodeClass(result.statusCode || 'Checking...')}`}></span>
                              {result.statusCode || 'Checking...'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="status-cell">
                        <button className={`recheck-btn ${isChecking || result.followStatus === 'Checking...' || result.followStatus === '-' ? 'recheck-hidden' : ''}`} onClick={() => onRecheckFollow(originalIndex)} title="Recheck Follow Status" disabled={isChecking || result.followStatus === 'Checking...'}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                        </button>
                        <span className={`status-badge ${getFollowClass(result.followStatus || 'Checking...')}`}>
                          <span className={`status-dot ${getFollowClass(result.followStatus || 'Checking...')}`}></span>
                          {result.followStatus || 'Checking...'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="status-cell">
                        <span className={`status-badge ${
                          result.indexStatus === 'Index Tag' ? 'indexed' :
                          result.indexStatus === 'Noindex Tag' ? 'noindex' :
                          result.indexStatus === 'N/A' ? 'na-status' :
                          'checking'
                        }`}>
                          <span className={`status-dot ${
                            result.indexStatus === 'Index Tag' ? 'indexed' :
                            result.indexStatus === 'Noindex Tag' ? 'noindex' :
                            result.indexStatus === 'N/A' ? 'na-status' :
                            'checking'
                          }`}></span>
                          {result.indexStatus || 'Checking...'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <a href={`https://www.google.com/search?q=site:${encodeURIComponent(result.url)}`} target="_blank" rel="noopener noreferrer" className="google-link">
                        Check on Google ↗
                      </a>
                    </td>
                  </tr>
                );
              })
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
      <p>Google Indexing Checker &mdash; A free SEO tool to verify URL index status and Dofollow/Nofollow status.</p>
    </footer>
  );
}

// ==========================================
// CSV EXPORT
// ==========================================
function exportCSV(results) {
  const header = 'URL,Status Code,Index Status,Follow Status,Redirected,Final URL,Status Codes,Google Search Link\n';
  const rows = results.map((r) => {
    const redirectInfo = r.redirectInfo || {};
    const statusCodes = redirectInfo.statusCodes || [];
    const statusCodesStr = statusCodes.join(' → ');

    return `"${r.url}","${r.statusCode || 'N/A'}","${r.status}","${r.followStatus || 'N/A'}","${redirectInfo.isRedirected ? 'Yes' : 'No'}","${redirectInfo.finalUrl || 'N/A'}","${statusCodesStr}","https://www.google.com/search?q=site:${encodeURIComponent(r.url)}"`;
  }).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `index-check-results-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ==========================================
// EXCEL EXPORT
// ==========================================
async function exportExcel(results) {
  try {
    const xlsxModule = await import('xlsx');
    const XLSX = xlsxModule.default || xlsxModule;
    const data = results.map((r, i) => {
      const redirectInfo = r.redirectInfo || {};
      const statusCodes = redirectInfo.statusCodes || [];
      const statusCodesStr = statusCodes.join(' → ');

      return {
        '#': i + 1,
        'URL': r.url,
        'Status Code': r.statusCode || 'N/A',
        'Index Status': r.status,
        'Follow Status': r.followStatus || 'N/A',
        'Redirected': redirectInfo.isRedirected ? 'Yes' : 'No',
        'Final URL': redirectInfo.finalUrl || 'N/A',
        'Status Codes': statusCodesStr,
        'Google Search Link': `https://www.google.com/search?q=site:${encodeURIComponent(r.url)}`,
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 50 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 50 },
      { wch: 80 },
      { wch: 70 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Index Results');
    XLSX.writeFile(workbook, `index-check-results-${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (err) {
    console.error('Excel export error:', err);
    alert('Excel export failed. Downloading CSV instead...');
    exportCSV(results);
  }
}

// ==========================================
// CLIENT-SIDE FOLLOW CHECK (Fallback for Error)
// Uses CORS proxy to fetch HTML from browser
// when Vercel server can't reach the site
// ==========================================
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://thingproxy.freeboard.io/fetch/',
  'https://cors-anywhere.herokuapp.com/',
];

// Extract clean domain from any input (full URL or just domain)
function cleanDomainInput(input) {
  if (!input) return '';
  let cleaned = input.trim().toLowerCase();
  cleaned = cleaned.replace(/^https?:\/\//, '');
  cleaned = cleaned.replace(/^www\./, '');
  cleaned = cleaned.replace(/\/.*$/, '');
  return cleaned;
}

async function clientSideFollowCheck(url, targetDomain) {
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy + encodeURIComponent(url);
      const response = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) continue;

      const html = await response.text();

      // Parse HTML using DOMParser (browser API)
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Normalize target domain for comparison (handles full URLs too)
      const normalizedTarget = cleanDomainInput(targetDomain);

      // Check 1: Meta robots nofollow (page-level)
      const metaRobots = doc.querySelector('meta[name="robots"]');
      if (metaRobots) {
        const content = (metaRobots.getAttribute('content') || '').toLowerCase();
        if (content.includes('nofollow')) {
          return 'Nofollow';
        }
      }

      // Check 2: Googlebot meta nofollow (page-level)
      const metaGooglebot = doc.querySelector('meta[name="googlebot"]');
      if (metaGooglebot) {
        const content = (metaGooglebot.getAttribute('content') || '').toLowerCase();
        if (content.includes('nofollow')) {
          return 'Nofollow';
        }
      }

      // If target domain is set, find ONLY links pointing to that domain
      if (normalizedTarget) {
        const allPageLinks = doc.querySelectorAll('a[href]');
        let targetLinksFound = 0;
        let targetNofollowCount = 0;

        allPageLinks.forEach((link) => {
          const href = link.getAttribute('href') || '';
          if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;

          let linkDomain = '';
          try {
            if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
              const fullUrl = href.startsWith('//') ? 'https:' + href : href;
              linkDomain = new URL(fullUrl).hostname.replace('www.', '').toLowerCase();
            } else {
              return;
            }
          } catch { return; }

          // Only check links pointing to the target domain
          if (linkDomain === normalizedTarget || linkDomain.endsWith('.' + normalizedTarget)) {
            targetLinksFound++;
            const rel = (link.getAttribute('rel') || '').toLowerCase();
            if (rel.includes('nofollow') || rel.includes('ugc') || rel.includes('sponsored')) {
              targetNofollowCount++;
            }
          }
        });

        if (targetLinksFound > 0) {
          // SEO Logic: If ANY link is dofollow, page passes link juice = Dofollow
          const dofollowCount = targetLinksFound - targetNofollowCount;
          return dofollowCount > 0 ? 'Dofollow' : 'Nofollow';
        }

        return 'No Link Found';
      }

      // OLD BEHAVIOR: If no target domain, check all outbound links with majority rule
      const contentSelectors = [
        'article', '.post-content', '.blog-content', '.entry-content',
        '.post-body', '.blog-body', '.article-content', '.article-body',
        '.read-content', '.read-blog', '.blog-post', '.post-text',
        '.main-content', '[itemprop="articleBody"]', '[itemprop="text"]',
        '.post', '.entry', 'main',
      ];

      let pageDomain = '';
      try { pageDomain = new URL(url).hostname.replace('www.', ''); } catch {}

      let contentEl = null;
      for (const sel of contentSelectors) {
        const el = doc.querySelector(sel);
        if (el && el.textContent.trim().length > 100) {
          contentEl = el;
          break;
        }
      }

      const container = contentEl || doc.body;
      const allLinks = container.querySelectorAll('a[href]');
      let totalOutbound = 0;
      let nofollowCount = 0;

      allLinks.forEach((link) => {
        const href = link.getAttribute('href') || '';
        if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;

        let linkDomain = '';
        try {
          if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
            const fullUrl = href.startsWith('//') ? 'https:' + href : href;
            linkDomain = new URL(fullUrl).hostname.replace('www.', '');
          } else {
            return;
          }
        } catch { return; }

        if (linkDomain === pageDomain) return;

        totalOutbound++;
        const rel = (link.getAttribute('rel') || '').toLowerCase();
        if (rel.includes('nofollow') || rel.includes('ugc') || rel.includes('sponsored')) {
          nofollowCount++;
        }
      });

      if (totalOutbound > 0) {
        const nofollowPct = (nofollowCount / totalOutbound) * 100;
        return nofollowPct > 50 ? 'Nofollow' : 'Dofollow';
      }

      return 'Dofollow';
    } catch {
      continue;
    }
  }

  return null;
}

// ==========================================
// Helper Functions for Status Codes
// ==========================================
function getStatusLabel(code) {
  if (code >= 200 && code < 300) return `${code} OK`;
  if (code === 301) return '301 Redirect';
  if (code === 302) return '302 Temp Redirect';
  if (code === 303) return '303 See Other';
  if (code === 307) return '307 Temp Redirect';
  if (code === 308) return '308 Permanent Redirect';
  if (code === 400) return '400 Bad Request';
  if (code === 401) return '401 Unauthorized';
  if (code === 403) return '403 Forbidden';
  if (code === 404) return '404 Not Found';
  if (code === 410) return '410 Gone';
  if (code === 429) return '429 Too Many Requests';
  if (code === 500) return '500 Server Error';
  if (code === 502) return '502 Bad Gateway';
  if (code === 503) return '503 Unavailable';
  if (code >= 300 && code < 400) return `${code} Redirect`;
  if (code >= 400 && code < 500) return `${code} Client Error`;
  if (code >= 500) return `${code} Server Error`;
  return `${code}`;
}

function getStatusCategory(code) {
  if (code >= 200 && code < 300) return 'success';
  if (code >= 300 && code < 400) return 'redirect';
  if (code >= 400 && code < 500) return 'client-error';
  if (code >= 500) return 'server-error';
  return 'unknown';
}

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function Home() {
  const [userName, setUserName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [targetDomain, setTargetDomain] = useState('');
  const [isSetup, setIsSetup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [urls, setUrls] = useState('');
  const [results, setResults] = useState([]);
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [checkIndex, setCheckIndex] = useState(true);
  const [checkFollow, setCheckFollow] = useState(true);
  const [checkStatus, setCheckStatus] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showOnlinePanel, setShowOnlinePanel] = useState(false);

  // Load saved settings on mount
  useEffect(() => {
    const savedName = localStorage.getItem('gic_user_name') || '';
    const savedKey = localStorage.getItem('gic_api_key') || '';
    const savedDomain = localStorage.getItem('gic_target_domain') || '';
    setUserName(savedName);
    setApiKey(savedKey);
    setTargetDomain(savedDomain);
    setIsSetup(savedName && savedKey ? true : false);

    // If user is already set up, mark them online
    if (savedName) {
      setUserOnline(savedName);
    }

    // Listen to online users
    const unsubscribe = listenOnlineUsers((users) => {
      setOnlineUsers(users);
    });

    // Cleanup: mark offline on tab close
    const handleBeforeUnload = () => {
      setUserOffline();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Save settings handler
  const handleSaveSettings = (name, key, domain) => {
    setUserName(name);
    setApiKey(key);
    setTargetDomain(domain || '');
    localStorage.setItem('gic_user_name', name);
    localStorage.setItem('gic_api_key', key);
    localStorage.setItem('gic_target_domain', domain || '');
    setIsSetup(true);
    // Mark user online with their name in Firebase
    setUserOnline(name);
  };

  const urlCount = urls.split('\n').filter((line) => line.trim().length > 0).length;

  // Recheck single URL - Index Status
  const recheckIndex = useCallback(async (urlIndex) => {
    const url = results[urlIndex]?.url;
    if (!url || !apiKey) return;

    const updated = [...results];
    updated[urlIndex] = { ...updated[urlIndex], status: 'Checking...' };
    setResults(updated);

    try {
      const response = await fetch('/api/check-index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [url], apiKey }),
      });
      const data = await response.json();
      updated[urlIndex] = { ...updated[urlIndex], status: data.results?.[0]?.status || 'Error' };
    } catch {
      updated[urlIndex] = { ...updated[urlIndex], status: 'Error' };
    }
    setResults([...updated]);
  }, [results, apiKey]);

  // Recheck single URL - Status Code
  const recheckStatus = useCallback(async (urlIndex) => {
    const url = results[urlIndex]?.url;
    if (!url) return;

    const updated = [...results];
    updated[urlIndex] = { ...updated[urlIndex], statusCode: 'Checking...' };
    setResults(updated);

    try {
      const response = await fetch('/api/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [url] }),
      });
      const data = await response.json();
      const result = data.results?.[0];
      updated[urlIndex] = {
        ...updated[urlIndex],
        statusCode: result?.statusLabel || 'Error',
        statusCategory: result?.category || 'error',
      };
    } catch {
      updated[urlIndex] = { ...updated[urlIndex], statusCode: 'Error' };
    }
    setResults([...updated]);
  }, [results]);

  // Recheck single URL - Follow Status
  const recheckFollow = useCallback(async (urlIndex) => {
    const url = results[urlIndex]?.url;
    if (!url) return;

    // Only recheck if status code is 200 OK
    const sc = results[urlIndex]?.statusCode || '';
    if (!sc.startsWith('200')) {
      const updated = [...results];
      updated[urlIndex] = { ...updated[urlIndex], followStatus: 'N/A' };
      setResults([...updated]);
      return;
    }

    const updated = [...results];
    updated[urlIndex] = { ...updated[urlIndex], followStatus: 'Checking...' };
    setResults(updated);

    try {
      const response = await fetch('/api/check-follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [url], targetDomain }),
      });
      const data = await response.json();
      updated[urlIndex] = { ...updated[urlIndex], followStatus: data.results?.[0]?.followStatus || 'Error' };
    } catch {
      updated[urlIndex] = { ...updated[urlIndex], followStatus: 'Error' };
    }
    setResults([...updated]);
  }, [results, targetDomain]);

  // Main check handler
  const handleCheck = useCallback(async () => {
    setError('');

    if (!checkIndex && !checkFollow && !checkStatus) {
      setError('Please select at least one check type.');
      return;
    }

    if (checkIndex && !apiKey) {
      setError('Please set your API key first (click the settings icon). API key is needed for Index Check.');
      return;
    }

    const urlList = urls.split('\n').map((u) => u.trim()).filter((u) => u.length > 0);

    if (urlList.length === 0) {
      setError('Please paste at least one URL to check.');
      return;
    }
    if (urlList.length > 500) {
      setError('Maximum 500 URLs allowed per check.');
      return;
    }

    setIsChecking(true);
    setResults([]);
    setFilter('all');

    const initialResults = urlList.map((url) => ({
      url,
      status: checkIndex ? 'Checking...' : '-',
      statusCode: checkStatus ? 'Checking...' : '-',
      followStatus: checkFollow ? 'Checking...' : '-',
    }));
    setResults(initialResults);

    const BATCH_SIZE = 5;
    const updatedResults = [...initialResults];

    // PHASE 1: Index Status (only if selected)
    if (checkIndex) {
      setProgress({ current: 0, total: urlList.length, phase: 'Checking index status...' });
      for (let i = 0; i < urlList.length; i += BATCH_SIZE) {
        const batch = urlList.slice(i, i + BATCH_SIZE);
        try {
          const response = await fetch('/api/check-index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: batch, apiKey }),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server error: ${response.status}`);
          }
          const data = await response.json();
          data.results.forEach((result, idx) => {
            const statusCodes = result.redirectInfo?.statusCodes || [];
            const finalStatusCode = statusCodes.length > 0 ? statusCodes[statusCodes.length - 1] : 200;
            const statusLabel = getStatusLabel(finalStatusCode);

            updatedResults[i + idx] = {
              ...updatedResults[i + idx],
              status: result.status,
              redirectInfo: result.redirectInfo || { statusCodes: [], finalUrl: null, redirectCount: 0, isRedirected: false },
              statusCode: statusLabel,
              statusCategory: getStatusCategory(finalStatusCode),
            };
          });
        } catch (err) {
          batch.forEach((url, idx) => {
            updatedResults[i + idx] = { ...updatedResults[i + idx], status: 'Error' };
          });
        }
        setResults([...updatedResults]);
        setProgress({ current: Math.min(i + BATCH_SIZE, urlList.length), total: urlList.length, phase: 'Checking index status...' });
        if (i + BATCH_SIZE < urlList.length) await new Promise((r) => setTimeout(r, 2000));
      }
    }

    // PHASE 2: HTTP Status Code (only if selected and not already from check-index)
    if (checkStatus && !checkIndex) {
      setProgress({ current: 0, total: urlList.length, phase: 'Checking HTTP status codes...' });
      for (let i = 0; i < urlList.length; i += BATCH_SIZE) {
        const batch = urlList.slice(i, i + BATCH_SIZE);
        try {
          const response = await fetch('/api/check-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: batch }),
          });
          if (!response.ok) throw new Error(`Server error: ${response.status}`);
          const data = await response.json();
          data.results.forEach((result, idx) => {
            updatedResults[i + idx] = {
              ...updatedResults[i + idx],
              statusCode: result.statusLabel || 'Error',
              statusCategory: result.category || 'error',
            };
          });
        } catch (err) {
          batch.forEach((url, idx) => {
            updatedResults[i + idx] = { ...updatedResults[i + idx], statusCode: 'Error', statusCategory: 'error' };
          });
        }
        setResults([...updatedResults]);
        setProgress({ current: Math.min(i + BATCH_SIZE, urlList.length), total: urlList.length, phase: 'Checking HTTP status codes...' });
        if (i + BATCH_SIZE < urlList.length) await new Promise((r) => setTimeout(r, 500));
      }
    }

    // PHASE 3: Before Follow check - set N/A for non-200 URLs and initialize indexStatus
    if (checkFollow) {
      updatedResults.forEach((r, idx) => {
        const sc = r.statusCode || '';
        if (!sc.startsWith('200') && sc !== '-' && sc !== 'Checking...') {
          updatedResults[idx] = { ...updatedResults[idx], followStatus: 'N/A', indexStatus: 'N/A' };
        } else {
          // Initialize indexStatus to Checking for URLs that will be checked
          if (!updatedResults[idx].indexStatus) {
            updatedResults[idx] = { ...updatedResults[idx], indexStatus: 'Checking...' };
          }
        }
      });
      setResults([...updatedResults]);
    }

    // PHASE 3 continued: Follow Status (only if selected and not already N/A)
    if (checkFollow) {
      setProgress({ current: 0, total: urlList.length, phase: 'Checking follow status...' });
      for (let i = 0; i < urlList.length; i += BATCH_SIZE) {
        const batch = urlList.slice(i, i + BATCH_SIZE);
        // Only check URLs where followStatus is still 'Checking...'
        const urlsToCheck = batch.filter((_, idx) => updatedResults[i + idx]?.followStatus === 'Checking...');

        if (urlsToCheck.length > 0) {
          try {
            const response = await fetch('/api/check-follow', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ urls: urlsToCheck, targetDomain }),
            });
            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            const data = await response.json();
            data.results.forEach((result, resultIdx) => {
              const originalIdx = batch.indexOf(urlsToCheck[resultIdx]);
              if (originalIdx !== -1) {
                updatedResults[i + originalIdx] = {
                  ...updatedResults[i + originalIdx],
                  followStatus: result.followStatus,
                  indexStatus: result.indexStatus || 'Indexed',
                };
              }
            });
          } catch (err) {
            batch.forEach((url, idx) => {
              if (updatedResults[i + idx]?.followStatus === 'Checking...') {
                updatedResults[i + idx] = { ...updatedResults[i + idx], followStatus: 'Error', indexStatus: 'N/A' };
              }
            });
          }
        }
        setResults([...updatedResults]);
        setProgress({ current: Math.min(i + BATCH_SIZE, urlList.length), total: urlList.length, phase: 'Checking follow status...' });
        if (i + BATCH_SIZE < urlList.length) await new Promise((r) => setTimeout(r, 500));
      }
    }

    // PHASE 4: Client-side fallback for "Error" and "No Link Found" results
    // Some sites (LinkedIn, csfactor) need JavaScript to render links
    // Browser can execute JS, so retry these from client-side via CORS proxy
    if (checkFollow) {
      const retryUrls = updatedResults
        .map((r, idx) => ({ ...r, idx }))
        .filter((r) => r.followStatus === 'Error' || r.followStatus === 'No Link Found');

      if (retryUrls.length > 0) {
        setProgress({ current: 0, total: retryUrls.length, phase: 'Retrying from browser (JS pages)...' });

        for (let i = 0; i < retryUrls.length; i++) {
          const { url, idx } = retryUrls[i];

          try {
            const result = await clientSideFollowCheck(url, targetDomain);
            if (result) {
              updatedResults[idx] = { ...updatedResults[idx], followStatus: result };
            } else {
              // Keep original status if browser also can't find
              // Don't overwrite "No Link Found" with N/A
            }
          } catch {
            // Keep original status on error
          }
          setResults([...updatedResults]);
          setProgress({ current: i + 1, total: retryUrls.length, phase: 'Retrying from browser (JS pages)...' });
        }
      }
    }

    setIsChecking(false);
  }, [urls, apiKey, targetDomain, checkIndex, checkFollow, checkStatus]);

  const hasResults = results.length > 0 && results.some((r) => r.status !== 'Checking...');

  // If not set up, show setup screen
  if (!isSetup) {
    return (
      <>
        <header className="header">
          <div className="header-inner">
            <a href="/" className="logo">
              <div className="logo-icon">GIC</div>
              <div className="logo-text">Google <span>Index Checker</span></div>
            </a>
          </div>
        </header>
        <SetupScreen onSave={handleSaveSettings} />
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header userName={userName} onSettingsClick={() => setShowSettings(true)} onlineUsers={onlineUsers} showOnlinePanel={showOnlinePanel} setShowOnlinePanel={setShowOnlinePanel} />
      <Hero />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        userName={userName}
        apiKey={apiKey}
        targetDomain={targetDomain}
        onSave={handleSaveSettings}
      />

      <main className="main-container">
        <div className="input-card">
          <div className="input-card-header">
            <div className="input-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Enter URLs to Check
            </div>
            <div className="url-count-badge">{urlCount} URL{urlCount !== 1 ? 's' : ''} entered</div>
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

          <div className="check-options">
            <span className="check-options-label">Select checks:</span>
            <label className="check-option">
              <input type="checkbox" checked={checkIndex} onChange={(e) => setCheckIndex(e.target.checked)} disabled={isChecking} />
              <span className="check-option-text">Index Check</span>
            </label>
            <label className="check-option">
              <input type="checkbox" checked={checkFollow} onChange={(e) => setCheckFollow(e.target.checked)} disabled={isChecking} />
              <span className="check-option-text">Dofollow/Nofollow</span>
            </label>
            <label className="check-option">
              <input type="checkbox" checked={checkStatus} onChange={(e) => setCheckStatus(e.target.checked)} disabled={isChecking} />
              <span className="check-option-text">Status Code</span>
            </label>
          </div>

          {error && (
            <div style={{ color: 'var(--error-red)', fontSize: '14px', marginBottom: '16px', padding: '10px 16px', background: 'rgba(255,23,68,0.06)', borderRadius: '8px', border: '1px solid rgba(255,23,68,0.15)' }}>
              {error}
            </div>
          )}

          <div className="button-row">
            <button className="btn-primary" onClick={handleCheck} disabled={isChecking || urlCount === 0}>
              {isChecking ? (<><span className="spinner"></span>Checking...</>) : (
                <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>Check Index &amp; Follow Status</>
              )}
            </button>

            {hasResults && (
              <>
                <button className="btn-secondary" onClick={() => exportCSV(results)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Export CSV
                </button>
                <button className="btn-excel" onClick={() => exportExcel(results)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Export Excel
                </button>
              </>
            )}

            {results.length > 0 && !isChecking && (
              <button className="btn-secondary" onClick={() => { setResults([]); setProgress({ current: 0, total: 0, phase: '' }); setFilter('all'); }}>
                Clear Results
              </button>
            )}
          </div>
        </div>

        {isChecking && progress.total > 0 && (
          <div className="progress-section">
            <div className="progress-header">
              <span className="progress-text">{progress.phase}</span>
              <span className="progress-count">{progress.current} / {progress.total}</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
            </div>
          </div>
        )}

        {hasResults && <StatsCards results={results} />}
        {results.length > 0 && <ResultsTable results={results} filter={filter} setFilter={setFilter} onRecheckIndex={recheckIndex} onRecheckStatus={recheckStatus} onRecheckFollow={recheckFollow} isChecking={isChecking} />}
      </main>

      <Footer />
    </>
  );
}
