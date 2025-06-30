import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { TeacherAide } from '../../types'; // Import TeacherAide type

const API_URL = '/api/teacher-aides';

// Define the state type for the aides slice
interface AidesState {
  items: TeacherAide[]; // items is an array of TeacherAide
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: AidesState = {
  items: [],
  status: 'idle',
  error: null,
};

export const fetchAides = createAsyncThunk<TeacherAide[]>( // Specify return type of the thunk
  'aides/fetchAides',
  async () => {
    const response = await axios.get(API_URL);
    return response.data;
  }
);

const aidesSlice = createSlice({
  name: 'aides',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAides.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAides.fulfilled, (state, action: PayloadAction<TeacherAide[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchAides.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch aides';
      });
  },
});

export default aidesSlice.reducer;
