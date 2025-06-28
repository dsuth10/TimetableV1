import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Task, Assignment } from '../types/task';

interface TimetableState {
  assignments: Assignment[];
  loading: boolean;
  error: string | null;
}

const initialState: TimetableState = {
  assignments: [],
  loading: false,
  error: null,
};

const timetableSlice = createSlice({
  name: 'timetable',
  initialState,
  reducers: {
    createAssignment: (state, action: PayloadAction<{
      taskId: number;
      aideId: number;
      day: string;
      startTime: string;
      duration: number;
    }>) => {
      const { taskId, aideId, day, startTime, duration } = action.payload;
      state.assignments.push({
        id: Date.now(),
        taskId,
        aideId,
        day,
        startTime,
        duration,
      });
    },
    updateAssignment: (state, action: PayloadAction<{
      id: number;
      updates: Partial<Assignment>;
    }>) => {
      const { id, updates } = action.payload;
      const assignment = state.assignments.find(a => a.id === id);
      if (assignment) {
        Object.assign(assignment, updates);
      }
    },
    deleteAssignment: (state, action: PayloadAction<number>) => {
      state.assignments = state.assignments.filter(a => a.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  createAssignment,
  updateAssignment,
  deleteAssignment,
  setLoading,
  setError,
} = timetableSlice.actions;

export default timetableSlice.reducer; 