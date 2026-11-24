import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import Plant from '../components/Plant.jsx';

const STEPS = [
  {
    icon: '🌱',
    title: '1. Choose what to grow',
    body: 'Pick a seedling: morning meditation, daily hydration, or evening pages. Name your intention and set a gentle cadence.',
  },
  {
    icon: '💧',
    title: '2. Show up each day',
    body: 'No punishing streaks. A simple tap records a day of genuine care, and your plant grows a little more.',
  },
  {
    icon: '🌺',
    title: '3. Watch it grow',
    body: 'Your small sprouts join into a personal garden. Months of consistency turn into blossoms.',
  },
];

const STAGES = ['seed', 'seedling', 'young', 'growing', 'mature', 'blooming'];

// The public front page. Logged-in users are sent straight to their garden.
export default function LandingPage() {
  const { status } = useAuth();
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;

  return (
    <div className="landing">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="brand__mark" aria-hidden="true">🌱</span>
          Habit Garden
        </Link>
        <Link to="/login" className="button button--ghost">Sign In</Link>
      </header>

      <section className="landing__hero" aria-labelledby="hero-title">
        <span className="landing__badge">
          <span aria-hidden="true">●</span> Mindful Habit Sanctuary
        </span>
        <h1 id="hero-title" className="landing__title">Your habits deserve more than a checkbox.</h1>
        <p className="landing__lead">Grow them. Nurture them. Watch them become a garden.</p>
        <p className="landing__copy">
          Habit Garden turns your daily habits into living plants. Show up today, give your plant a little care.
          Keep going, and watch it grow with you.
        </p>
        <div className="landing__actions">
          <Link to="/signup" className="button">🌱 Start Growing</Link>
          <Link to="/login" className="button button--ghost">I already have a garden</Link>
        </div>
        <p className="landing__note">No complicated productivity system. Just one day at a time.</p>
      </section>

      <section className="landing__section" aria-labelledby="how-title">
        <p className="landing__eyebrow">The gentle journey</p>
        <h2 id="how-title">Plant a habit. Show up. Watch it grow.</h2>
        <div className="landing__steps">
          {STEPS.map((step) => (
            <article key={step.title} className="landing__step">
              <span className="landing__step-icon" aria-hidden="true">{step.icon}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing__section landing__missed" aria-labelledby="missed-title">
        <p className="landing__eyebrow">Kind accountability</p>
        <h2 id="missed-title">Missed a day? Your garden noticed.</h2>
        <p>
          Life happens. Your plant may wilt slightly when you stop checking in, but it isn&apos;t gone. No resetting to
          zero, no angry red X badges. Come back, pour a little water, and start caring for it again.
        </p>
        <p><strong>You can always come back.</strong></p>
      </section>

      <section className="landing__section" aria-labelledby="stages-title">
        <p className="landing__eyebrow">Tactile ecosystem</p>
        <h2 id="stages-title">A progress bar could never do this.</h2>
        <div className="landing__stages">
          {STAGES.map((stage) => (
            <div key={stage} className="landing__stage">
              <Plant stage={stage} wilt="none" />
              {stage}
            </div>
          ))}
        </div>
      </section>

      <section className="landing__cta" aria-labelledby="cta-title">
        <h2 id="cta-title">Ready to grow something?</h2>
        <p>Start with one habit. Give it a little care each day. Watch how quietly your days transform.</p>
        <div className="landing__actions">
          <Link to="/signup" className="button">🌱 Start Growing</Link>
          <Link to="/login" className="button button--ghost">Log In</Link>
        </div>
      </section>

      <footer className="landing__footer">Private &amp; safe · No ads ever</footer>
    </div>
  );
}
