// src/redux/slices/doctorsSlice.js
// Manages the doctor registry (admin can add/remove doctors and courses).
import { createSlice } from '@reduxjs/toolkit';
import { INITIAL_DOCTORS } from '../../utils/auth';

const doctorsSlice = createSlice({
  name: 'doctors',
  initialState: {
    list: [...INITIAL_DOCTORS],
  },
  reducers: {
    addDoctor:    (state, action) => { state.list.push(action.payload); },
    deleteDoctor: (state, action) => { state.list = state.list.filter(d => d.id !== action.payload); },
    addCourse:    (state, action) => {
      const { docId, course } = action.payload;
      const doctor = state.list.find(d => d.id === docId);
      if (doctor) doctor.courses.push(course);
    },
    deleteCourse: (state, action) => {
      const { docId, courseUid } = action.payload;
      const doctor = state.list.find(d => d.id === docId);
      if (doctor) doctor.courses = doctor.courses.filter(c => c.uid !== courseUid);
    },
  },
});

export const { addDoctor, deleteDoctor, addCourse, deleteCourse } = doctorsSlice.actions;
export default doctorsSlice.reducer;
