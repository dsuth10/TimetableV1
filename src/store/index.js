import { configureStore } from '@reduxjs/toolkit';
import aidesReducer from './slices/aidesSlice';
import tasksReducer from './slices/tasksSlice';
import assignmentsReducer from './slices/assignmentsSlice';
import absencesReducer from './slices/absencesSlice';
import timetableReducer from './slices/timetableSlice';

export const store = configureStore({
  reducer: {
    aides: aidesReducer,
    tasks: tasksReducer,
    assignments: assignmentsReducer,
    absences: absencesReducer,
    timetable: timetableReducer,
  },
}); 