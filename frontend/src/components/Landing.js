import { Link } from 'react-router-dom';
import './Landing.css';

const Landing = () => {
  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-content">
          <div className="nav-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="#3b82f6"/>
              <path d="M16 10v12M10 16h12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span className="nav-title">De Tender Care</span>
          </div>
          <div className="nav-actions">
            <Link to="/login" className="nav-button">Staff Login</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              De Tender Care
              <span className="hero-highlight"> File Management System</span>
            </h1>
            <p className="hero-subtitle">
              Welcome to De Tender Care's internal patient file management system. 
              Access your dashboard to manage patient files, track locations, and coordinate with staff.
            </p>
            <div className="hero-actions">
              <Link to="/login" className="cta-button primary">
                Access Dashboard
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" d="M4 8a.5.5 0 01.5-.5h5.793L8.146 5.354a.5.5 0 11.708-.708l3 3a.5.5 0 010 .708l-3 3a.5.5 0 01-.708-.708L10.293 8.5H4.5A.5.5 0 014 8z"/>
                </svg>
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="dashboard-preview">
              <div className="preview-header">
                <div className="preview-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="preview-title">Patient Dashboard</div>
              </div>
              <div className="preview-content">
                <div className="preview-stats">
                  <div className="preview-stat">
                    <div className="stat-icon blue">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                      </svg>
                    </div>
                    <div className="stat-info">
                      <div className="stat-value">847</div>
                      <div className="stat-name">Patient Files</div>
                    </div>
                  </div>
                  <div className="preview-stat">
                    <div className="stat-icon green">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm2-3a2 2 0 11-4 0 2 2 0 014 0z"/>
                      </svg>
                    </div>
                    <div className="stat-info">
                      <div className="stat-value">23</div>
                      <div className="stat-name">On Duty Staff</div>
                    </div>
                  </div>
                </div>
                <div className="preview-table">
                  <div className="table-header">Recent Files</div>
                  <div className="table-rows">
                    <div className="table-row">
                      <div className="row-name">John Adebayo</div>
                      <div className="row-id">ID: 2401</div>
                      <div className="row-location">C15-S3-F42</div>
                    </div>
                    <div className="table-row">
                      <div className="row-name">Sarah Chen</div>
                      <div className="row-id">ID: 2398</div>
                      <div className="row-location">C12-S8-F15</div>
                    </div>
                    <div className="table-row">
                      <div className="row-name">Michael Okafor</div>
                      <div className="row-id">ID: 2395</div>
                      <div className="row-location">C20-S2-F88</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect width="24" height="24" rx="4" fill="#3b82f6"/>
                <path d="M12 8v8M8 12h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>De Tender Care</span>
            </div>
            <p className="footer-tagline">
              Internal file management system for De Tender Care Hospital staff.
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 De Tender Care Hospital. Internal Staff System.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;