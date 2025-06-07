import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunk for fetching timetable data
export const fetchTimetableData = createAsyncThunk(
  'timetable/fetchData',
  async () => {
    const response = await fetch('/api/timetable');
    if (!response.ok) {
      throw new Error('Failed to fetch timetable data');
    }
    return response.json();
  }
);

const initialState = {
  aides: [],
  assignments: [],
  absences: [],
  loading: false,
  error: null,
};

const timetableSlice = createSlice({
  name: 'timetable',
  initialState,
  reducers: {
    updateAssignment: (state, action) => {
      const { id, ...updates } = action.payload;
      const assignment = state.assignments.find(a => a.id === id);
      if (assignment) {
        Object.assign(assignment, updates);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTimetableData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTimetableData.fulfilled, (state, action) => {
        state.loading = false;
        state.aides = action.payload.aides;
        state.assignments = action.payload.assignments;
        state.absences = action.payload.absences;
      })
      .addCase(fetchTimetableData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { updateAssignment } = timetableSlice.actions;
export default timetableSlice.reducer; 