// src/redux/rootReducer.js
import { combineReducers } from '@reduxjs/toolkit';
import authReducer     from './slices/authSlice';
import doctorsReducer  from './slices/doctorsSlice';
import lectureReducer  from './slices/lectureSlice';

const rootReducer = combineReducers({
  auth:    authReducer,
  doctors: doctorsReducer,
  lecture: lectureReducer,
});

export default rootReducer;
