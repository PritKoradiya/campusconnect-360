import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <main className="public-page">
      <section className="public-panel">
        <h1>Page Not Found</h1>
        <p>The page you are looking for is not available in the current frontend setup.</p>
        <Link className="btn" to="/">
          Go Home
        </Link>
      </section>
    </main>
  );
}

export default NotFoundPage;
