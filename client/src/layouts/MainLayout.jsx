import { Outlet } from 'react-router-dom';
import Footer from '../components/common/Footer';
import Header from '../components/common/Header';
import Sidebar from '../components/common/Sidebar';

function MainLayout() {
  return (
    <div className="app-shell">
      <Header />
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default MainLayout;
