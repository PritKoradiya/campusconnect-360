import { LogOut, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { useAuth } from '../../context/AuthContext';

function Header() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const roleLabel = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';

  return (
    <header className="header">
      <div className="header-brand">
        <span className="brand-mark">
          <img src={logo} alt="CampusConnect 360 logo" />
        </span>
        <div>
          <h1 className="brand-title">CampusConnect 360</h1>
          <p className="brand-subtitle">Smart Campus Utility & Student Support Platform</p>
        </div>
      </div>
      <div className="header-actions">
        <div className="header-user">
          <span className="header-user-icon">
            <UserRound size={18} />
          </span>
          <span>{user ? user.name : 'Guest User'}</span>
          {user && <span className="header-role-badge">{roleLabel}</span>}
        </div>
        {user && (
          <button className="header-logout-button" onClick={handleLogout} type="button">
            <LogOut size={16} />
            Logout
          </button>
        )}
      </div>
    </header>
  );
}

export default Header;
