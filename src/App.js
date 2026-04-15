import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import './App.css';
import './responsive.css';
import { LanguageProvider } from './i18n';
import { AppProviders } from './providers';
import { AppRoutes } from './routes';

export default function App() {
  return (
    <LanguageProvider>
      <AppProviders>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProviders>
    </LanguageProvider>
  );
}
