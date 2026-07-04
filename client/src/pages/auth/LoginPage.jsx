import { Link } from 'react-router-dom';

function LoginPage() {
  return (
    <main className="public-page">
      <section className="public-panel">
        <h1>Login</h1>
        <p>Login page placeholder. Authentication form and backend connection will be added in the next frontend step.</p>
        <div className="public-actions">
          <Link className="btn" to="/student/dashboard">
            View Student Dashboard
          </Link>
          <Link className="btn btn-secondary" to="/register">
            Register
          </Link>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
