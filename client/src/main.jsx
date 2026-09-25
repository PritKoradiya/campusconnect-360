import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AuthProvider from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { PwaProvider } from './context/PwaContext.jsx';
import './styles/global.css';
import './styles/pwa.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PwaProvider>
      <AuthProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </AuthProvider>
    </PwaProvider>
  </StrictMode>
);
