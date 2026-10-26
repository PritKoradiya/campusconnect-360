import { motion } from 'framer-motion';
import {
  Activity,
  Award,
  BarChart3,
  Bell,
  Bot,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  FilePlus,
  LayoutDashboard,
  MessageSquareText,
  Search,
  UserCircle,
  Users,
  X
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const groupedLinksByRole = {
  student: [
    {
      group: 'MAIN',
      links: [
        { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
        { label: 'Activity Feed', path: '/student/activity', icon: Activity },
        { label: 'Achievements', path: '/student/achievements', icon: Award },
        { label: 'My Profile', path: '/student/profile', icon: UserCircle }
      ]
    },
    {
      group: 'SERVICES & SUPPORT',
      links: [
        { label: 'Submit Complaint', path: '/student/submit-complaint', icon: FilePlus },
        { label: 'My Complaints', path: '/student/my-complaints', icon: ClipboardList },
        { label: 'AI Campus Assistant', path: '/student/chatbot', icon: Bot }
      ]
    },
    {
      group: 'CAMPUS LIFE',
      links: [
        { label: 'Notices', path: '/student/notices', icon: Bell },
        { label: 'Events', path: '/student/events', icon: CalendarDays },
        { label: 'My Registrations', path: '/student/my-registrations', icon: CalendarCheck },
        { label: 'Campus Calendar', path: '/student/calendar', icon: Calendar },
        { label: 'Lost & Found', path: '/student/lost-found', icon: Search }
      ]
    }
  ],
  admin: [
    {
      group: 'OVERVIEW',
      links: [
        { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Analytics', path: '/admin/analytics', icon: Activity },
        { label: 'Reports', path: '/admin/reports', icon: BarChart3 }
      ]
    },
    {
      group: 'CAMPUS SERVICES',
      links: [
        { label: 'Manage Complaints', path: '/admin/complaints', icon: ClipboardList },
        { label: 'Notices', path: '/admin/notices', icon: Bell },
        { label: 'Events', path: '/admin/events', icon: CalendarDays },
        { label: 'Lost & Found', path: '/admin/lost-found', icon: Search },
        { label: 'Campus Calendar', path: '/admin/calendar', icon: Calendar }
      ]
    },
    {
      group: 'ADMINISTRATION',
      links: [
        { label: 'Manage Users', path: '/admin/users', icon: Users },
        { label: 'Departments', path: '/admin/departments', icon: Building2 }
      ]
    }
  ],
  department: [
    {
      group: 'OVERVIEW',
      links: [
        { label: 'Dashboard', path: '/department/dashboard', icon: LayoutDashboard }
      ]
    },
    {
      group: 'OPERATIONS',
      links: [
        { label: 'Assigned Complaints', path: '/department/complaints', icon: ClipboardList },
        { label: 'Update Status', path: '/department/status', icon: BarChart3 },
        { label: 'Remarks', path: '/department/remarks', icon: MessageSquareText }
      ]
    }
  ]
};

function Sidebar({ isOpen = false, onClose }) {
  const { user } = useAuth();
  const groups = groupedLinksByRole[user?.role] || [];

  return (
    <motion.aside
      animate={{ opacity: 1, x: 0 }}
      className={`sidebar ${isOpen ? 'sidebar-mobile-open' : ''}`}
      initial={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="sidebar-heading">
        <div className="sidebar-heading-meta">
          <p className="sidebar-title">Workspace</p>
          <span className="sidebar-role-badge">{user?.role || 'user'}</span>
        </div>
        {onClose && (
          <button
            type="button"
            className="sidebar-mobile-close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {groups.map((group, groupIdx) => (
          <div className="sidebar-group" key={group.group}>
            <p className="sidebar-group-title">{group.group}</p>
            <div className="sidebar-group-links">
              {group.links.map((link, linkIdx) => {
                const Icon = link.icon;
                const totalIndex = groupIdx * 4 + linkIdx;

                return (
                  <motion.div
                    animate={{ opacity: 1, x: 0 }}
                    initial={{ opacity: 0, x: -8 }}
                    key={link.path}
                    transition={{ duration: 0.25, delay: 0.03 * totalIndex, ease: 'easeOut' }}
                  >
                    <NavLink
                      className={({ isActive }) =>
                        isActive ? 'sidebar-link active' : 'sidebar-link'
                      }
                      to={link.path}
                      onClick={() => {
                        if (onClose) onClose();
                      }}
                    >
                      <Icon className="sidebar-link-icon" size={19} />
                      <span className="sidebar-link-label">{link.label}</span>
                    </NavLink>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </motion.aside>
  );
}

export default Sidebar;
