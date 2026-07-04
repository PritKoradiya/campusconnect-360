import { Link } from 'react-router-dom';

function RegisterPage() {
  return (
    <main className="public-page">
      <section className="public-panel">
        <h1>Register</h1>
        <p>Register page placeholder. User registration UI will be connected to the backend in a later step.</p>
        <div className="public-actions">
          <Link className="btn" to="/login">
            Login
          </Link>
          <Link className="btn btn-secondary" to="/">
            Home
          </Link>
        </div>
      </section>
    </main>
  );
}

export default RegisterPage;
