jest.mock('./components/StudentBrowserBoundary', () => ({ children }) => children);
import React from 'react';
import { render, screen } from '@testing-library/react';

// The shell test runs in jsdom, which does not provide a canvas renderer.
jest.mock('lottie-web', () => ({
  loadAnimation: () => ({ destroy: jest.fn() }),
}));

jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <>{children}</>,
  Routes: ({ children }) => <>{children}</>,
  Route: ({ element }) => element || null,
  Navigate: () => null,
  Outlet: () => null,
  NavLink: ({ children, to, className }) => (
    <a href={to} className={typeof className === 'function' ? className({ isActive: false }) : className}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: '/' }),
}), { virtual: true });

jest.mock('./routes', () => ({
  AppRoutes: () => <div>App routes</div>,
}));

import App from './App';

test('renders app shell', () => {
  render(<App />);
  expect(screen.getByText(/app routes/i)).toBeInTheDocument();
});
