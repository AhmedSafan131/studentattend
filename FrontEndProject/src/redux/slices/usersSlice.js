// src/redux/slices/usersSlice.js
// Admin-managed users API state: admins, doctors, students, and doctor courses.
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  addDoctorCourse as addDoctorCourseApi,
  createUser as createUserApi,
  deleteDoctorCourse as deleteDoctorCourseApi,
  deleteUser as deleteUserApi,
  fetchUsers,
  fetchManagedStudents,
  updateUser as updateUserApi,
} from '../../services/authApi';
import {
  createApiThunk,
  setRequestFailed,
  setRequestLoading,
  setRequestSucceeded,
} from '../../utils/apiHelpers';
import { normalizeAdminRecord, normalizeDoctorRecord } from '../../utils/auth';

export const loadUsers = createApiThunk(
  createAsyncThunk,
  'users/loadUsers',
  fetchUsers,
);

export const loadStudents = createApiThunk(
  createAsyncThunk,
  'users/loadStudents',
  fetchManagedStudents,
);

export const createManagedUser = createApiThunk(
  createAsyncThunk,
  'users/createManagedUser',
  createUserApi,
);

export const updateManagedUser = createApiThunk(
  createAsyncThunk,
  'users/updateManagedUser',
  updateUserApi,
);

export const deleteManagedUser = createApiThunk(
  createAsyncThunk,
  'users/deleteManagedUser',
  deleteUserApi,
);

export const createDoctorCourse = createApiThunk(
  createAsyncThunk,
  'users/createDoctorCourse',
  addDoctorCourseApi,
);

export const removeDoctorCourse = createApiThunk(
  createAsyncThunk,
  'users/removeDoctorCourse',
  deleteDoctorCourseApi,
);

const normalizeUsersPayload = (payload = {}) => ({
  admins: (payload.admins || []).map(normalizeAdminRecord),
  doctors: (payload.doctors || []).map(normalizeDoctorRecord),
  students: payload.students || [],
});

const replaceById = (items, item) => items.map((current) => (
  current.id === item.id ? item : current
));

const removeById = (items, id) => items.filter((item) => item.id !== id);

const initialState = {
  admins: [],
  doctors: [],
  students: [],
  status: 'idle',
  studentsStatus: 'idle',
  mutationStatus: 'idle',
  error: '',
  mutationError: '',
};

const addMutationCases = (builder, thunks) => {
  thunks.forEach((thunk) => {
    builder
      .addCase(thunk.pending, (state) => setRequestLoading(state, 'mutationStatus', 'mutationError'))
      .addCase(thunk.rejected, (state, action) => setRequestFailed(state, action, 'mutationStatus', 'mutationError'));
  });
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearUsers: (state) => {
      state.admins = [];
      state.doctors = [];
      state.students = [];
      state.status = 'idle';
      state.studentsStatus = 'idle';
      state.mutationStatus = 'idle';
      state.error = '';
      state.mutationError = '';
    },
    clearUsersErrors: (state) => {
      state.error = '';
      state.mutationError = '';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUsers.pending, (state) => setRequestLoading(state, 'status', 'error'))
      .addCase(loadUsers.fulfilled, (state, action) => {
        setRequestSucceeded(state, 'status');
        const users = normalizeUsersPayload(action.payload);
        state.admins = users.admins;
        state.doctors = users.doctors;
      })
      .addCase(loadUsers.rejected, (state, action) => {
        setRequestFailed(state, action, 'status', 'error');
        state.admins = [];
        state.doctors = [];
      })
      .addCase(loadStudents.pending, (state) => setRequestLoading(state, 'studentsStatus', 'error'))
      .addCase(loadStudents.fulfilled, (state, action) => {
        setRequestSucceeded(state, 'studentsStatus');
        state.students = action.payload || [];
      })
      .addCase(loadStudents.rejected, (state, action) => {
        setRequestFailed(state, action, 'studentsStatus', 'error');
        state.students = [];
      })
      .addCase(createManagedUser.fulfilled, (state, action) => {
        setRequestSucceeded(state, 'mutationStatus');
        const user = action.payload;
        if (user.userRole === 'admin') state.admins.push(normalizeAdminRecord(user));
        if (user.userRole === 'staff' || user.userRole === 'doctor') state.doctors.push(normalizeDoctorRecord(user));
        if (user.userRole === 'student') state.students.push(user);
      })
      .addCase(updateManagedUser.fulfilled, (state, action) => {
        setRequestSucceeded(state, 'mutationStatus');
        const user = action.payload;
        if (user.userRole === 'admin') state.admins = replaceById(state.admins, normalizeAdminRecord(user));
        if (user.userRole === 'staff' || user.userRole === 'doctor') state.doctors = replaceById(state.doctors, normalizeDoctorRecord(user));
        if (user.userRole === 'student') state.students = replaceById(state.students, user);
      })
      .addCase(deleteManagedUser.fulfilled, (state, action) => {
        setRequestSucceeded(state, 'mutationStatus');
        const userId = action.payload;
        state.admins = removeById(state.admins, userId);
        state.doctors = removeById(state.doctors, userId);
        state.students = removeById(state.students, userId);
      })
      .addCase(createDoctorCourse.fulfilled, (state, action) => {
        setRequestSucceeded(state, 'mutationStatus');
        state.doctors = replaceById(state.doctors, normalizeDoctorRecord(action.payload));
      })
      .addCase(removeDoctorCourse.fulfilled, (state, action) => {
        setRequestSucceeded(state, 'mutationStatus');
        state.doctors = replaceById(state.doctors, normalizeDoctorRecord(action.payload));
      });

    addMutationCases(builder, [
      createManagedUser,
      updateManagedUser,
      deleteManagedUser,
      createDoctorCourse,
      removeDoctorCourse,
    ]);
  },
});

export const { clearUsers, clearUsersErrors } = usersSlice.actions;

export const selectUsersState = (state) => state.users;
export const selectManagedUsers = (state) => ({
  admins: state.users.admins,
  doctors: state.users.doctors,
  students: state.users.students,
});

export default usersSlice.reducer;
