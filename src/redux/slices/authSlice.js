// src/redux/slices/authSlice.js
// Manages authenticated user state.
// Ready to replace React useState in App.js when needed.
import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
  },
  reducers: {
    signIn:  (state, action) => { state.user = action.payload; },
    signOut: (state)         => { state.user = null; },
  },
});

export const { signIn, signOut } = authSlice.actions;
export default authSlice.reducer;
