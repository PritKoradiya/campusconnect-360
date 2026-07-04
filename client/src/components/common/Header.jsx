import { UserRound } from 'lucide-react';

function Header() {
  return (
    <header className="header">
      <div className="header-brand">
        <span className="brand-mark">C</span>
        <div>
          <h1 className="brand-title">CampusConnect 360</h1>
          <p className="brand-subtitle">Smart Campus Utility & Student Support Platform</p>
        </div>
      </div>
      <div className="header-actions">
        <UserRound size={18} />
        <span>Frontend Foundation</span>
      </div>
    </header>
  );
}

export default Header;
