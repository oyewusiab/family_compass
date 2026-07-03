import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export const OfflineSyncIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [syncQueue, setSyncQueue] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Listen to custom events to simulate offline changes
  useEffect(() => {
    const handleQueueChange = () => {
      // Generate a random queue change or increment by 1
      setSyncQueue(prev => prev + 1);
    };

    window.addEventListener('offline-db-change', handleQueueChange);
    return () => {
      window.removeEventListener('offline-db-change', handleQueueChange);
    };
  }, []);

  const handleToggleConnection = () => {
    const nextState = !isOnline;
    setIsOnline(nextState);

    if (nextState && syncQueue > 0) {
      // Reconnected! Sync queue items
      setSyncing(true);
      setTimeout(() => {
        setSyncQueue(0);
        setSyncing(false);
      }, 1500);
    }
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.75rem', 
        background: 'var(--bg-secondary)', 
        padding: '0.4rem 0.8rem', 
        borderRadius: '10px', 
        border: '1px solid var(--border-color)',
        fontSize: '0.75rem',
        fontWeight: '700'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: isOnline ? 'var(--success-color)' : 'var(--danger-color)' }}>
        {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
        <span>{isOnline ? 'Online' : 'Offline'}</span>
      </div>

      {syncQueue > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-gold)' }}>
          {syncing ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          <span>{syncing ? 'Syncing...' : `${syncQueue} pending syncs`}</span>
        </div>
      )}

      <button 
        onClick={handleToggleConnection} 
        style={{
          border: 'none',
          background: 'var(--primary-color)',
          color: 'white',
          padding: '0.2rem 0.5rem',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '0.7rem'
        }}
      >
        {isOnline ? 'Simulate Disconnect' : 'Reconnect & Sync'}
      </button>
    </div>
  );
};
