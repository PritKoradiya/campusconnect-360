import { WifiOff, RefreshCw } from 'lucide-react';
import { usePwa } from '../../context/PwaContext';

export default function PwaStatusBanner() {
  const { isOffline, needRefresh, updateServiceWorker } = usePwa();

  if (!isOffline && !needRefresh) {
    return null;
  }

  return (
    <div className="pwa-banner-container" role="region" aria-label="Connection and Update Status">
      {isOffline && (
        <div className="pwa-banner pwa-offline-banner">
          <WifiOff size={16} className="pwa-offline-icon" />
          <span>
            <strong className="pwa-offline-title">You&apos;re offline.</strong>
            Some live campus data is unavailable until your connection is restored.
          </span>
        </div>
      )}

      {needRefresh && (
        <div className="pwa-banner pwa-update-banner">
          <RefreshCw size={16} className="pwa-update-icon" />
          <span>New version available</span>
          <button
            type="button"
            className="pwa-refresh-btn"
            onClick={() => updateServiceWorker(true)}
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
