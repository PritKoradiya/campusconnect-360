import {
  BarChart3,
  Bell,
  Bot,
  Building2,
  CalendarDays,
  ClipboardList,
  FilePlus,
  LayoutDashboard,
  MessageSquareText,
  Search,
  Users
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const linksByRole = {
  student: [
    { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Submit Complaint', path: '/student/complaints/new', icon: FilePlus },
    { label: 'My Complaints', path: '/student/complaints', icon: ClipboardList },
    { label: 'Notices', path: '/student/notices', icon: Bell },
    { label: 'Events', path: '/student/events', icon: CalendarDays },
    { label: 'Lost & Found', path: '/student/lost-found', icon: Search },
    { label: 'AI Chatbot', path: '/student/chatbot', icon: Bot }
  ],
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Manage Users', path: '/admin/users', icon: Users },
    { label: 'Manage Complaints', path: '/admin/complaints', icon: ClipboardList },
    { label: 'Departments', path: '/admin/departments', icon: Building2 },
    { label: 'Notices', path: '/admin/notices', icon: Bell },
    { label: 'Events', path: '/admin/events', icon: CalendarDays },
    { label: 'Reports', path: '/admin/reports', icon: BarChart3 }
  ],
  department: [
    { label: 'Dashboard', path: '/department/dashboard', icon: LayoutDashboard },
    { label: 'Assigned Complaints', path: '/department/complaints', icon: ClipboardList },
    { label: 'Update Status', path: '/department/status', icon: BarChart3 },
    { label: 'Remarks', path: '/department/remarks', icon: MessageSquareText }
  ]
};

function Sidebar() {
  const { user } = useAuth();
  const links = linksByRole[user?.role] || [];

  return (
    <aside className="sidebar">
      <div className="sidebar-heading">
        <p className="sidebar-title">Workspace</p>
        <span>{user?.role || 'user'}</span>
      </div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <NavLink
              key={link.path}
              className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
              to={link.path}
            >
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
