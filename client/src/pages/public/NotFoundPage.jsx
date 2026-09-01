import { motion } from 'framer-motion';
import { ArrowLeft, Compass, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { getDashboardPath, useAuth } from '../../context/AuthContext';

function NotFoundPage() {
  const { user } = useAuth();
  const targetDashboard = user?.role ? getDashboardPath(user.role) : '/login';

  return (
    <main className="campus-auth-page" style={{ justifyContent: 'center', padding: '32px 20px' }}>
      <motion.section
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="campus-auth-card"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        style={{
          maxWidth: '520px',
          width: '100%',
          margin: '0 auto',
          textAlign: 'center',
          padding: '40px 32px'
        }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '16px',
            background: 'rgba(34, 211, 238, 0.12)',
            border: '1px solid rgba(34, 211, 238, 0.3)',
            color: '#22d3ee'
          }}
        >
          <Compass size={32} />
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <img src={logo} alt="CampusConnect 360" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            CampusConnect 360
          </span>
        </div>

        <h1 style={{ margin: '0 0 12px', fontSize: '32px', fontWeight: 850, color: '#ffffff', lineHeight: 1.2 }}>
          404 – Page Not Found
        </h1>

        <p style={{ margin: '0 0 28px', color: '#94a3b8', fontSize: '15px', lineHeight: 1.6 }}>
          The page you are looking for does not exist or has been moved.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link
            className="complaint-submit-button"
            style={{ textDecoration: 'none', justifyContent: 'center' }}
            to={targetDashboard}
          >
            <Home size={18} />
            <span>{user ? 'Back to Dashboard' : 'Go to Login'}</span>
          </Link>

          {user && (
            <Link
              className="complaint-secondary-button"
              style={{ textDecoration: 'none', justifyContent: 'center' }}
              to="/login"
            >
              <ArrowLeft size={16} />
              <span>Back to Login</span>
            </Link>
          )}
        </div>
      </motion.section>
    </main>
  );
}

export default NotFoundPage;
