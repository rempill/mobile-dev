import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { defineCustomElements } from '@ionic/pwa-elements/loader'

// Leaflet styling
import 'leaflet/dist/leaflet.css';

// Capacitor PWA Elements for camera UI in desktop/PWA mode
defineCustomElements(window);

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);