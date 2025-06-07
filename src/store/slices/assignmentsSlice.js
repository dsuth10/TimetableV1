import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { assignmentAPI } from '../../services/api';

export const fetchAssignments = createAsyncThunk(
  'assignments/fetchAssignments',
  async () => {
    const response = await assignmentAPI.getAll();
    return response.data;
  }
);

const assignmentsSlice = createSlice({
  name: 'assignments',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssignments.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAssignments.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchAssignments.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export default assignmentsSlice.reducer; 