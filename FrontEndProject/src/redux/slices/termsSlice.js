import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { termsApi } from '../../utils/api';

const SELECTED_TERM_STORAGE_KEY = 'uniattend_selected_term';

const getInitialSelectedTerm = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(SELECTED_TERM_STORAGE_KEY) || '';
};

export const fetchTerms = createAsyncThunk(
  'terms/fetchTerms',
  async (_, { rejectWithValue }) => {
    try {
      const response = await termsApi.getAll();
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load terms');
    }
  }
);

export const fetchActiveTerm = createAsyncThunk(
  'terms/fetchActiveTerm',
  async (_, { rejectWithValue }) => {
    try {
      const response = await termsApi.getActive();
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load active term');
    }
  }
);

export const createTermThunk = createAsyncThunk(
  'terms/createTerm',
  async (termData, { dispatch, rejectWithValue }) => {
    try {
      const response = await termsApi.create(termData);
      dispatch(fetchTerms());
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create term');
    }
  }
);

export const updateTermThunk = createAsyncThunk(
  'terms/updateTerm',
  async ({ id, data }, { dispatch, rejectWithValue }) => {
    try {
      const response = await termsApi.update(id, data);
      dispatch(fetchTerms());
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update term');
    }
  }
);

export const activateTermThunk = createAsyncThunk(
  'terms/activateTerm',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      const response = await termsApi.activate(id);
      dispatch(fetchTerms());
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to set active term');
    }
  }
);

export const deleteTermThunk = createAsyncThunk(
  'terms/deleteTerm',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await termsApi.delete(id);
      dispatch(fetchTerms());
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete term');
    }
  }
);

const termsSlice = createSlice({
  name: 'terms',
  initialState: {
    terms: [],
    activeTerm: null,
    selectedTermCode: getInitialSelectedTerm(),
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedTermCode: (state, action) => {
      state.selectedTermCode = action.payload;
      if (typeof window !== 'undefined') {
        if (action.payload) {
          window.localStorage.setItem(SELECTED_TERM_STORAGE_KEY, action.payload);
        } else {
          window.localStorage.removeItem(SELECTED_TERM_STORAGE_KEY);
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTerms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTerms.fulfilled, (state, action) => {
        state.loading = false;
        state.terms = action.payload;
        const active = action.payload.find((t) => t.isActive);
        if (active) {
          state.activeTerm = active;
          const selectedTermExists = action.payload.some((term) => term.code === state.selectedTermCode);
          if (!selectedTermExists) {
            state.selectedTermCode = active.code;
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(SELECTED_TERM_STORAGE_KEY, active.code);
            }
          }
        }
      })
      .addCase(fetchTerms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchActiveTerm.fulfilled, (state, action) => {
        state.activeTerm = action.payload;
        if (!state.selectedTermCode) {
          state.selectedTermCode = action.payload.code;
        }
      })
      .addCase(activateTermThunk.fulfilled, (state, action) => {
        const activated = action.payload;
        state.activeTerm = activated;
        state.selectedTermCode = activated.code;
        state.terms = state.terms.map((term) => ({
          ...term,
          isActive: term.id === activated.id || term.code === activated.code,
        }));
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(SELECTED_TERM_STORAGE_KEY, activated.code);
        }
      });
  },
});

export const { setSelectedTermCode } = termsSlice.actions;
export default termsSlice.reducer;
