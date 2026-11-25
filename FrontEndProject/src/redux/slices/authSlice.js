// src/redux/slices/authSlice.js
// Authentication API state.
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { loginWithApi, restoreStudentSessionWithApi } from '../../services/authApi';
import {
  createApiThunk,
  setRequestFailed,
  setRequestLoading,
  setRequestSucceeded,
} from '../../utils/apiHelpers';

const AUTH_STORAGE_KEY = 'studentattend.auth.user';

const getStoredUser = () => {
  if (typeof window === 'undefined') return null;

  try {
    return JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
  } catch (error) {
    return null;
  }
};

export const login = createApiThunk(
  createAsyncThunk,
  'auth/login',
  loginWithApi,
  'Unable to sign in. Please try again.',
);

export const restoreStudentSession = createAsyncThunk(
  'auth/restoreStudentSession',
  async (options, { rejectWithValue }) => {
    try {
      return await restoreStudentSessionWithApi(options);
    } catch (error) {
      const status = Number(error?.response?.status || 0);
      return rejectWithValue({
        sessionExpired: status === 401 || status === 419,
        message: error?.response?.data?.message || error?.message || 'Unable to restore the student session.',
      });
    }
  },
);

const initialUser = getStoredUser();

const initialState = {
  user: initialUser,
  isAuthenticated: Boolean(initialUser),
  loginMessage: '',
  status: 'idle',
  error: '',
  bootstrapStatus: 'idle',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signOut: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loginMessage = '';
      state.error = '';
      state.bootstrapStatus = 'ready';
    },
    updateCurrentUser: (state, action) => {
      if (!state.user) return;

      state.user = {
        ...state.user,
        ...action.payload,
      };
    },
    clearAuthErrors: (state) => {
      state.error = '';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        setRequestLoading(state, 'status', 'error');
        state.loginMessage = '';
      })
      .addCase(login.fulfilled, (state, action) => {
        setRequestSucceeded(state, 'status');
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.loginMessage = action.payload.message || '';
        state.bootstrapStatus = 'ready';
      })
      .addCase(login.rejected, (state, action) => {
        setRequestFailed(state, action, 'status', 'error');
        state.user = null;
        state.isAuthenticated = false;
        state.bootstrapStatus = 'ready';
      })
      .addCase(restoreStudentSession.pending, (state) => {
        state.bootstrapStatus = 'restoring';
      })
      .addCase(restoreStudentSession.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.bootstrapStatus = 'ready';
        state.error = '';
      })
      .addCase(restoreStudentSession.rejected, (state, action) => {
        if (action.payload?.sessionExpired
          && (state.user?.userRole === 'student' || state.user?.role === 'student')) {
          state.user = null;
          state.isAuthenticated = false;
        }
        state.bootstrapStatus = 'ready';
      });
  },
});

export const {
  signOut,
  updateCurrentUser,
  clearAuthErrors,
} = authSlice.actions;

export const selectAuth = (state) => state.auth;
export const selectCurrentUser = (state) => state.auth.user;

export { AUTH_STORAGE_KEY };

export default authSlice.reducer;
