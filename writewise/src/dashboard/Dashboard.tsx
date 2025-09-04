import React from 'react';
import { createRoot } from 'react-dom/client';

const Dashboard: React.FC = () => {
  return (
    <div style={{ 
      padding: '20px', 
      color: 'white',
      minHeight: '100vh'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            marginBottom: '8px'
          }}>
            ✨ WriteWise Dashboard
          </h1>
          <p style={{
            fontSize: '18px',
            opacity: 0.8
          }}>
            Your AI Writing Coach Analytics & Settings
          </p>
        </div>

        {/* Coming Soon */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚧</div>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Dashboard Coming Soon</h2>
          <p style={{ fontSize: '16px', opacity: 0.8, marginBottom: '32px' }}>
            We're building an amazing dashboard with analytics, goal setting, and premium features.
          </p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginTop: '32px'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
              <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Analytics</h3>
              <p style={{ fontSize: '12px', opacity: 0.7 }}>Track your writing improvement</p>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
              <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Goals</h3>
              <p style={{ fontSize: '12px', opacity: 0.7 }}>Customize your writing style</p>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚙️</div>
              <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Settings</h3>
              <p style={{ fontSize: '12px', opacity: 0.7 }}>Configure preferences</p>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚀</div>
              <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Premium</h3>
              <p style={{ fontSize: '12px', opacity: 0.7 }}>Unlock advanced features</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Render the dashboard
const container = document.getElementById('dashboard-root');
if (container) {
  const root = createRoot(container);
  root.render(<Dashboard />);
}