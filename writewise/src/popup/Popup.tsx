import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { StorageManager } from '../shared/storage';
import type { UserProfile, ProgressMetrics } from '../shared/types';

const Popup: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [usageStats, setUsageStats] = useState<{
    remaining: number;
    total: number;
    subscription: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get user profile from storage
      const storageManager = StorageManager.getInstance();
      const userProfile = await storageManager.getUserProfile();
      setProfile(userProfile);

      // Get usage stats from background script
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({ action: 'getUsageStats' }, resolve);
      });

      if (response.success) {
        setUsageStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load popup data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDashboard = () => {
    chrome.runtime.sendMessage({ action: 'openDashboard' });
    window.close();
  };

  const getUsageColor = () => {
    if (!usageStats) return '#10b981';
    const usagePercent = ((usageStats.total - usageStats.remaining) / usageStats.total) * 100;
    if (usagePercent < 50) return '#10b981';
    if (usagePercent < 80) return '#f59e0b';
    return '#ef4444';
  };

  const getUsagePercent = () => {
    if (!usageStats) return 0;
    return Math.round(((usageStats.total - usageStats.remaining) / usageStats.total) * 100);
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: 'white' 
      }}>
        <div style={{ fontSize: '14px' }}>Loading WriteWise...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '0', 
      color: 'white',
      minHeight: '400px'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '20px',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 'bold',
          marginBottom: '4px'
        }}>
          ✨ WriteWise
        </div>
        <div style={{ 
          fontSize: '12px', 
          opacity: 0.8 
        }}>
          AI Writing Coach
        </div>
      </div>

      {/* Usage Stats */}
      {usageStats && (
        <div style={{ padding: '20px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '14px' }}>Today's Usage</span>
              <span style={{
                background: usageStats.subscription === 'premium' ? '#8b5cf6' : '#6b7280',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '10px',
                textTransform: 'uppercase'
              }}>
                {usageStats.subscription}
              </span>
            </div>
            
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                height: '8px',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: getUsageColor(),
                  height: '100%',
                  width: `${getUsagePercent()}%`,
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              opacity: 0.8
            }}>
              <span>{usageStats.total - usageStats.remaining} used</span>
              <span>{usageStats.remaining} remaining</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <button
              onClick={openDashboard}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                padding: '12px 8px',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              📊 Dashboard
            </button>
            
            <button
              onClick={() => {
                chrome.tabs.create({ url: 'https://writewise.ai/upgrade' });
                window.close();
              }}
              style={{
                background: usageStats.subscription === 'free' ? '#8b5cf6' : 'rgba(255, 255, 255, 0.1)',
                border: usageStats.subscription === 'free' ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                padding: '12px 8px',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (usageStats.subscription === 'free') {
                  e.currentTarget.style.background = '#7c3aed';
                } else {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }
              }}
              onMouseOut={(e) => {
                if (usageStats.subscription === 'free') {
                  e.currentTarget.style.background = '#8b5cf6';
                } else {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }
              }}
            >
              🚀 {usageStats.subscription === 'free' ? 'Upgrade' : 'Premium'}
            </button>
          </div>

          {/* Status */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '12px',
            textAlign: 'center'
          }}>
            {usageStats.remaining > 0 ? (
              <span>✅ WriteWise is active and ready to help!</span>
            ) : (
              <span>⚠️ Daily limit reached. Upgrade for unlimited suggestions.</span>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '0',
        left: '0',
        right: '0',
        padding: '12px 20px',
        background: 'rgba(0, 0, 0, 0.2)',
        textAlign: 'center',
        fontSize: '10px',
        opacity: 0.7
      }}>
        Privacy-first local AI • Made with ❤️
      </div>
    </div>
  );
};

// Render the popup
const container = document.getElementById('popup-root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}