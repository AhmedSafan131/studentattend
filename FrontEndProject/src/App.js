import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider as ReduxProvider } from 'react-redux';
import './App.css';
import './responsive.css';
import { LanguageProvider } from './i18n';
import { AppProviders } from './providers';
import { AppRoutes } from './routes';
import store from './redux/store';
import { StudentPwaProvider } from './pwa';
import StudentBrowserBoundary from './components/StudentBrowserBoundary';
import { APP_BASE_PATH } from './utils/appBasePath';

export default function App() {
  return (
    <LanguageProvider>
      <ReduxProvider store={store}>
        <BrowserRouter basename={APP_BASE_PATH || '/'}>
          <StudentBrowserBoundary>
          <StudentPwaProvider>
            <AppProviders>
              <AppRoutes />
            </AppProviders>
          </StudentPwaProvider>
          </StudentBrowserBoundary>
        </BrowserRouter>
      </ReduxProvider>
    </LanguageProvider>
  );
}
