export const extractApiData = (response) => response?.data?.data ?? response?.data ?? null;

export const extractApiMessage = (response, fallback = "") =>
  response?.data?.message || fallback;

export const extractApiMeta = (response) => response?.data?.meta ?? {};

export const extractApiError = (error, fallback = "Request failed") => {
  const responseData = error?.response?.data;
  const validationErrors = responseData?.errors;

  if (validationErrors && typeof validationErrors === "object") {
    const firstError = Object.values(validationErrors).flat().find(Boolean);
    if (firstError) {
      return firstError;
    }
  }

  return responseData?.message || error?.message || fallback;
};

export const createApiThunk = (createAsyncThunk, typePrefix, apiCall, fallbackMessage) =>
  createAsyncThunk(typePrefix, async (payload, { rejectWithValue }) => {
    try {
      return await apiCall(payload);
    } catch (error) {
      return rejectWithValue(extractApiError(error, fallbackMessage));
    }
  });

export const setRequestLoading = (state, statusKey, errorKey) => {
  state[statusKey] = "loading";
  state[errorKey] = "";
};

export const setRequestSucceeded = (state, statusKey) => {
  state[statusKey] = "succeeded";
};

export const setRequestFailed = (state, action, statusKey, errorKey) => {
  state[statusKey] = "failed";
  state[errorKey] = action.payload || action.error?.message || "Request failed";
};
