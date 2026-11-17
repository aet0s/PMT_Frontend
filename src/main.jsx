import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { syncServerTime } from './lib/dateFormat';

// Synchronize server time immediately on application startup
syncServerTime();

// Apply accessibility and density preferences immediately on boot
if (typeof window !== 'undefined') {
  try {
    if (localStorage.getItem('taskflow_reduced_motion') === 'true') {
      document.documentElement.classList.add('reduce-motion');
    }
    if (localStorage.getItem('taskflow_density') === 'compact') {
      document.documentElement.classList.add('density-compact');
    }
  } catch (e) {}
}

// Automatically reload page when a dynamically imported chunk fails to load due to a new deployment
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[vite] Preload error detected, reloading page to fetch latest version...', event);
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

