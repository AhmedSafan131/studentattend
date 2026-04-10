// src/redux/slices/lectureSlice.js
// Manages active lecture session state.
import { createSlice } from '@reduxjs/toolkit';

const lectureSlice = createSlice({
  name: 'lecture',
  initialState: {
    active:          false,
    lectureId:       '',
    selectedCourse:  '',
    selectedSection: '',
    selectedWeek:    '',
    attendedStudents:[],
    allSessions:     {},
  },
  reducers: {
    startLecture: (state, action) => {
      state.active          = true;
      state.lectureId       = action.payload.lectureId;
      state.attendedStudents = [];
    },
    endLecture: (state) => {
      const key = `${state.selectedCourse}__${state.selectedSection}__${state.selectedWeek}`;
      state.allSessions[key] = state.attendedStudents;
      state.active           = false;
    },
    addAttendee:      (state, action) => { state.attendedStudents.push(action.payload); },
    setCourse:        (state, action) => { state.selectedCourse  = action.payload; state.selectedSection = ''; },
    setSection:       (state, action) => { state.selectedSection = action.payload; },
    setWeek:          (state, action) => { state.selectedWeek    = action.payload; },
    resetLecture:     (state)         => {
      state.active = false; state.lectureId = '';
      state.selectedCourse = ''; state.selectedSection = ''; state.selectedWeek = '';
      state.attendedStudents = [];
    },
  },
});

export const {
  startLecture, endLecture, addAttendee,
  setCourse, setSection, setWeek, resetLecture,
} = lectureSlice.actions;
export default lectureSlice.reducer;
