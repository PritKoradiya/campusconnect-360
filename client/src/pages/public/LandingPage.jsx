import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <main className="public-page">
      <section className="public-panel">
        <h1>CampusConnect 360</h1>
        <p>Smart campus utility and student support platform for complaints, notices, events, lost and found, and helpdesk support.</p>
        <div className="public-actions">
          <Link className="btn" to="/login">
            Login
          </Link>
          <Link className="btn btn-secondary" to="/register">
            Register
          </Link>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
