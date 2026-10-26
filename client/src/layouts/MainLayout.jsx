import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Footer from '../components/common/Footer';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';
import '../styles/dashboard.css';

function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className={`app-shell ${isMobileMenuOpen ? 'mobile-menu-active' : ''}`}>
      <Header
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
      />
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      {isMobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}
      <main
        className="main-content"
        onClick={() => {
          if (isMobileMenuOpen) setIsMobileMenuOpen(false);
        }}
      >
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default MainLayout;

