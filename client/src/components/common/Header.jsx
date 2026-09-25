import { motion } from 'framer-motion';
import { Download, LogOut, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { useAuth } from '../../context/AuthContext';
import { usePwa } from '../../context/PwaContext';
import NotificationBell from './NotificationBell';
import { disconnectSocket } from '../../services/socket';

function Header() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { canInstall, installApp } = usePwa();

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login', { replace: true });
  };

  const roleLabel = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';

  return (
    <motion.header
      animate={{ opacity: 1, y: 0 }}
      className="header"
      initial={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <motion.div
        animate={{ opacity: 1, x: 0 }}
        className="header-brand"
        initial={{ opacity: 0, x: -12 }}
        transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
      >
        <span className="brand-mark">
          <img src={logo} alt="CampusConnect 360 logo" />
        </span>
        <div>
          <h1 className="brand-title">CampusConnect 360</h1>
          <p className="brand-subtitle">Smart Campus Utility & Student Support Platform</p>
        </div>
      </motion.div>
      <div className="header-actions">
        {canInstall && (
          <motion.button
            aria-label="Install CampusConnect 360 App"
            className="header-install-btn"
            onClick={installApp}
            title="Install CampusConnect App"
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Download size={15} />
            <span>Install App</span>
          </motion.button>
        )}
        {user && <NotificationBell />}
        <motion.div
          className="header-user"
          onClick={() => {
            if (user?.role === 'student') {
              navigate('/student/profile');
            }
          }}
          style={user?.role === 'student' ? { cursor: 'pointer' } : undefined}
          title={user?.role === 'student' ? 'View your student profile' : undefined}
          whileHover={{ y: -2 }}
        >
          {user?.profileImage ? (
            <img
              alt={user.name || 'User avatar'}
              className="header-user-avatar-img"
              src={user.profileImage}
            />
          ) : (
            <span className="header-user-icon">
              <UserRound size={18} />
            </span>
          )}
          <span>{user ? user.name : 'Guest User'}</span>
          {user && <span className="header-role-badge">{roleLabel}</span>}
        </motion.div>
        {user && (
          <motion.button
            className="header-logout-button"
            onClick={handleLogout}
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <LogOut size={16} />
            Logout
          </motion.button>
        )}
      </div>
    </motion.header>
  );
}

export default Header;
