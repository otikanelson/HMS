import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1920&q=80';

const FILES_IMAGE =
  'https://images.unsplash.com/photo-1769092992803-ee97d235ba87?auto=format&fit=crop&w=900&q=80';

// Placeholder content — there's no notices backend yet. Swap this for a
// real fetch (e.g. GET /api/notices) once one exists; the shape below
// (type/date/title/body) is what the component expects either way.
const NOTICES = [
  {
    key: 'payroll-live',
    type: 'update',
    date: 'Sep 2, 2026',
    title: 'Payroll module now live',
    body: 'August payroll can be processed directly in the system. See an Administrator for access.',
  },
  {
    key: 'onboarding',
    type: 'info',
    date: 'Aug 28, 2026',
    title: 'New staff onboarding',
    body: 'New hires now get login credentials automatically as soon as their staff record is created.',
  },
  {
    key: 'maintenance',
    type: 'urgent',
    date: 'Aug 20, 2026',
    title: 'Scheduled maintenance',
    body: 'The system will be briefly unavailable Sunday, 2:00\u20132:30 AM, for a server update.',
  },
];

const NOTICE_LABELS = {
  update: 'Update',
  info: 'Info',
  urgent: 'Urgent',
};

const HIGHLIGHTS = [
  {
    key: 'search',
    title: 'Find any file in seconds',
    body: 'Search by patient ID, name, or phone number and get an exact cabinet, shelf, and folder — not a guess.',
  },
  {
    key: 'accountability',
    title: 'Know who touched what',
    body: 'Every location change and payroll entry is logged against the person who made it.',
  },
  {
    key: 'current',
    title: 'Always current',
    body: 'Duty status, schedules, and pay status reflect what\u2019s true right now, not last week\u2019s printout.',
  },
];

/**
 * Reveals an element once it scrolls into view by toggling a class,
 * and does nothing (renders everything visible) if the browser/user
 * has requested reduced motion.
 */
function useRevealOnScroll(count) {
  const refs = useRef([]);
  const [visible, setVisible] = useState(() => new Array(count).fill(false));

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReduced) {
      setVisible(new Array(count).fill(true));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.dataset.revealIndex);
            setVisible((prev) => {
              if (prev[idx]) return prev;
              const next = [...prev];
              next[idx] = true;
              return next;
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25 }
    );

    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [count]);

  return { refs, visible };
}

const Landing = () => {
  const [scrolled, setScrolled] = useState(false);
  const highlightsReveal = useRevealOnScroll(HIGHLIGHTS.length);
  const noticesReveal = useRevealOnScroll(NOTICES.length);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="landing-page">
      <nav className={`landing-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="nav-content">
          <div className="nav-logo">
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <path
                d="M5 7a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v1H5V7Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <rect
                x="5" y="9.5" width="18" height="11.5" rx="1.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </svg>
            <span className="nav-title">Tender Care</span>
          </div>
          <div className="nav-actions">
            <Link to="/login" className="nav-login">
              Staff Login
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="hero-section">
          <div className="hero-media" style={{ backgroundImage: `url(${HERO_IMAGE})` }} />
          <div className="hero-scrim" />
          <div className="hero-content">
            <h1 className="hero-title">
              Patient files, staff schedules, and payroll — run from one place.
            </h1>
            <p className="hero-subtitle">
              Tender Care Hospital&rsquo;s internal system for finding files fast,
              keeping schedules straight, and paying staff on time.
            </p>
            <Link to="/login" className="cta-button">
              Staff Login
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <div className="hero-scroll-cue" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 8l5 5 5-5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </section>

        <section className="notices-section" aria-label="Staff notices">
          <div className="notices-heading">
            <h2>Staff Notices</h2>
            <span className="notices-heading-line" aria-hidden="true" />
          </div>

          <div className="notice-board">
            {NOTICES.map((notice, i) => (
              <article
                key={notice.key}
                ref={(el) => (noticesReveal.refs.current[i] = el)}
                data-reveal-index={i}
                className={`notice-card notice-card-${i} notice-type-${notice.type} ${
                  noticesReveal.visible[i] ? 'is-visible' : ''
                }`}
              >
                <span className="notice-pin" aria-hidden="true" />
                <div className="notice-card-top">
                  <span className="notice-badge">{NOTICE_LABELS[notice.type]}</span>
                  <span className="notice-date">{notice.date}</span>
                </div>
                <h3>{notice.title}</h3>
                <p>{notice.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="modules-section" aria-label="What this system covers">
          <div className="modules-intro">
            <h2>Built around three problems, not a hundred features</h2>
            <p>No diagnosis notes, no billing, no clinical history — just the operational work that was breaking down.</p>
          </div>

          <div className="modules-row">
            <article className="module-card module-card-photo">
              <div className="module-photo">
                <img src={FILES_IMAGE} alt="" loading="lazy" />
              </div>
              <div className="module-card-body">
                <h3>Patient Files</h3>
                <p>Every file has a place — cabinet, shelf, folder. Register, search, and track location history without a paper log.</p>
              </div>
            </article>

            <article className="module-card module-card-icon">
              <div className="module-icon">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="var(--primary-600)" strokeWidth="1.6" />
                  <path d="M11 6.5V11l3 2" stroke="var(--primary-600)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="module-card-body">
                <h3>Staff &amp; Schedules</h3>
                <p>See who&rsquo;s on duty and their shift, so reaching the right person doesn&rsquo;t take three phone calls.</p>
              </div>
            </article>

            <article className="module-card module-card-icon">
              <div className="module-icon">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <rect x="3" y="5" width="16" height="12" rx="2" stroke="var(--primary-600)" strokeWidth="1.6" />
                  <path d="M3 9h16M7 13h2" stroke="var(--primary-600)" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <div className="module-card-body">
                <h3>Payroll</h3>
                <p>One clear record of what every staff member is owed, and confirmation once they&rsquo;ve been paid.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="highlights-section">
          <div className="highlights-row">
            {HIGHLIGHTS.map((item, i) => (
              <div
                key={item.key}
                ref={(el) => (highlightsReveal.refs.current[i] = el)}
                data-reveal-index={i}
                className={`highlight-item ${highlightsReveal.visible[i] ? 'is-visible' : ''}`}
              >
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="footer-row">
          <span className="footer-brand">Tender Care Hospital</span>
          <p>Internal staff system. Access is limited to hospital personnel.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;