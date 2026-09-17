import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AuthProvider from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </AuthProvider>
  </StrictMode>
);
