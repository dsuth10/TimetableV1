import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { absenceAPI } from '../../services/api';

export const fetchAbsences = createAsyncThunk(
  'absences/fetchAbsences',
  async () => {
    const response = await absenceAPI.getAll();
    return response.data;
  }
);

const absencesSlice = createSlice({
  name: 'absences',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAbsences.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAbsences.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchAbsences.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export default absencesSlice.reducer; 