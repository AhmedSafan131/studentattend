// src/redux/rootReducer.js
import { combineReducers } from '@reduxjs/toolkit';
import authReducer     from './slices/authSlice';
import usersReducer    from './slices/usersSlice';
import lectureReducer  from './slices/lectureSlice';
import termsReducer    from './slices/termsSlice';

const rootReducer = combineReducers({
  auth:    authReducer,
  users:   usersReducer,
  lecture: lectureReducer,
  terms:   termsReducer,
});

export default rootReducer;

