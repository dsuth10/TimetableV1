import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = '/api/teacher-aides';

export const fetchAides = createAsyncThunk(
  'aides/fetchAides',
  async () => {
    const response = await axios.get(API_URL);
    return response.data;
  }
);

const aidesSlice = createSlice({
  name: 'aides',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAides.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAides.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchAides.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export default aidesSlice.reducer; 