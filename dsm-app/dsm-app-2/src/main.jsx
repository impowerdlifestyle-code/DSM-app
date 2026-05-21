import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register service worker (PWA install on Chrome/Android + offline shell)
if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* no-op */ })
  })
}
