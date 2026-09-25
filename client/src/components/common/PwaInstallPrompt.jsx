import { AnimatePresence, motion } from 'framer-motion';
import { Download, X } from 'lucide-react';
import logo from '../../assets/logo.png';
import { usePwa } from '../../context/PwaContext';

export default function PwaInstallPrompt() {
  const { canInstall, isDismissed, installApp, dismissInstallPrompt } = usePwa();

  if (!canInstall || isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="Install CampusConnect 360"
        className="pwa-install-modal"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <div className="pwa-install-header">
          <div className="pwa-install-branding">
            <img src={logo} alt="CampusConnect 360 logo" className="pwa-install-logo" />
            <div>
              <h2 className="pwa-install-title">Install CampusConnect</h2>
              <p className="pwa-install-subtitle">Smart Campus Utility &amp; Student Support Platform</p>
            </div>
          </div>
          <button
            type="button"
            className="pwa-install-close"
            onClick={dismissInstallPrompt}
            aria-label="Dismiss installation prompt"
          >
            <X size={18} />
          </button>
        </div>

        <div className="pwa-install-actions">
          <button
            type="button"
            className="pwa-install-btn"
            onClick={installApp}
          >
            <Download size={15} />
            Install App
          </button>
          <button
            type="button"
            className="pwa-dismiss-btn"
            onClick={dismissInstallPrompt}
          >
            Later
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
