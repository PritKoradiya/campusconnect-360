import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLiveAnalytics from './pages/admin/AdminLiveAnalytics';
import AdminReports from './pages/admin/AdminReports';
import Departments from './pages/admin/Departments';
import ManageComplaints from './pages/admin/ManageComplaints';
import ManageEvents from './pages/admin/ManageEvents';
import EventAttendance from './pages/admin/EventAttendance';
import ManageLostFound from './pages/admin/ManageLostFound';
import ManageNotices from './pages/admin/ManageNotices';
import ManageUsers from './pages/admin/ManageUsers';
import DepartmentComplaints from './pages/department/DepartmentComplaints';
import DepartmentDashboard from './pages/department/DepartmentDashboard';
import DepartmentRemarks from './pages/department/DepartmentRemarks';
import DepartmentStatus from './pages/department/DepartmentStatus';
import NotFoundPage from './pages/public/NotFoundPage';
import StudentCampusCalendar from './pages/student/CampusCalendar';
import AdminCampusCalendar from './pages/admin/CampusCalendar';
import StudentProfile from './pages/student/StudentProfile';
import Chatbot from './pages/student/Chatbot';
import Events from './pages/student/Events';
import MyRegistrations from './pages/student/MyRegistrations';
import LostFound from './pages/student/LostFound';
import MyComplaints from './pages/student/MyComplaints';
import Notices from './pages/student/Notices';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentAchievements from './pages/student/StudentAchievements';
import StudentActivityFeed from './pages/student/StudentActivityFeed';
import SubmitComplaint from './pages/student/SubmitComplaint';
import NotificationsPage from './pages/notifications/NotificationsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<MainLayout />}>
          <Route element={<ProtectedRoute allowedRoles={['student', 'admin', 'department']} />}>
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/activity" element={<StudentActivityFeed />} />
            <Route path="/student/achievements" element={<StudentAchievements />} />
            <Route path="/student/profile" element={<StudentProfile />} />
            <Route path="/student/submit-complaint" element={<SubmitComplaint />} />
            <Route path="/student/my-complaints" element={<MyComplaints />} />
            <Route path="/student/notices" element={<Notices />} />
            <Route path="/student/events" element={<Events />} />
            <Route path="/student/my-registrations" element={<MyRegistrations />} />
            <Route path="/student/calendar" element={<StudentCampusCalendar />} />
            <Route path="/student/lost-found" element={<LostFound />} />
            <Route path="/student/chatbot" element={<Chatbot />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<ManageUsers />} />
            <Route path="/admin/departments" element={<Departments />} />
            <Route path="/admin/complaints" element={<ManageComplaints />} />
            <Route path="/admin/notices" element={<ManageNotices />} />
            <Route path="/admin/events" element={<ManageEvents />} />
            <Route path="/admin/events/:eventId/attendance" element={<EventAttendance />} />
            <Route path="/admin/lost-found" element={<ManageLostFound />} />
            <Route path="/admin/calendar" element={<AdminCampusCalendar />} />
            <Route path="/admin/analytics" element={<AdminLiveAnalytics />} />
            <Route path="/admin/reports" element={<AdminReports />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['department']} />}>
            <Route path="/department/dashboard" element={<DepartmentDashboard />} />
            <Route path="/department/complaints" element={<DepartmentComplaints />} />
            <Route path="/department/status" element={<DepartmentStatus />} />
            <Route path="/department/remarks" element={<DepartmentRemarks />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
