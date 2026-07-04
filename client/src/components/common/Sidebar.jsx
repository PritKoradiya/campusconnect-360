import { LayoutDashboard, ShieldCheck, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const links = [
  {
    label: 'Student',
    path: '/student/dashboard',
    icon: UserRound
  },
  {
    label: 'Admin',
    path: '/admin/dashboard',
    icon: ShieldCheck
  },
  {
    label: 'Department',
    path: '/department/dashboard',
    icon: LayoutDashboard
  }
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <p className="sidebar-title">Dashboards</p>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <NavLink key={link.path} className="sidebar-link" to={link.path}>
              <Icon size={18} />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
