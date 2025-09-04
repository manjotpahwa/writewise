// Simple background script without ES modules
console.log('WriteWise background script initializing...');

// Basic message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  try {
    switch (request.action) {
      case 'getUserProfile':
        // Simple response for now
        sendResponse({ 
          success: true, 
          data: {
            id: 'user-1',
            email: 'user@example.com',
            subscription: 'free',
            usageCount: 0,
            dailyLimit: 50
          }
        });
        break;
        
      case 'getUsageStats':
        sendResponse({ 
          success: true, 
          data: {
            remaining: 50,
            total: 50,
            subscription: 'free'
          }
        });
        break;
        
      case 'openDashboard':
        const dashboardUrl = chrome.runtime.getURL('src/dashboard/index.html');
        chrome.tabs.create({ url: dashboardUrl });
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Background script error:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  return true; // Keep message channel open
});

// Installation handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('WriteWise extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // Open welcome page
    const welcomeUrl = chrome.runtime.getURL('src/dashboard/index.html?welcome=true');
    chrome.tabs.create({ url: welcomeUrl });
  }
});

// Startup handler  
chrome.runtime.onStartup.addListener(() => {
  console.log('WriteWise extension started');
});

console.log('WriteWise background script initialized successfully');