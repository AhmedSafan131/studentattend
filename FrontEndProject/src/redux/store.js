// src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './rootReducer';
import { AUTH_STORAGE_KEY } from './slices/authSlice';

const store = configureStore({
  reducer: rootReducer,
});

let previousUser = store.getState().auth.user;

store.subscribe(() => {
  if (typeof window === 'undefined') return;

  const nextUser = store.getState().auth.user;
  if (nextUser === previousUser) return;

  previousUser = nextUser;

  try {
    if (nextUser) {
      const storedUser = nextUser.userRole === 'student'
        ? { ...nextUser, token: undefined, expiresAt: undefined }
        : nextUser;
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(storedUser));
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch (error) {
    // Keep Redux state working if storage is unavailable.
  }
});

export default store;
