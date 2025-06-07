import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import TimetableGrid from '../TimetableGrid';
import timetableReducer from '../../../store/slices/timetableSlice';

const mockTimetableData = {
  aides: [
    { id: 1, name: 'John Doe', color: '#4CAF50' },
    { id: 2, name: 'Jane Smith', color: '#2196F3' },
  ],
  assignments: [
    {
      id: 1,
      aideId: 1,
      day: 'Monday',
      startTime: '09:00',
      endTime: '10:00',
      task: 'Math Support',
      categoryColor: '#FFC107',
    },
  ],
  absences: [
    {
      id: 1,
      aideId: 2,
      day: 'Monday',
      reason: 'Sick leave',
    },
  ],
};

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      timetable: timetableReducer,
    },
    preloadedState: {
      timetable: {
        aides: [],
        assignments: [],
        absences: [],
        loading: false,
        error: null,
        ...initialState,
      },
    },
  });
};

describe('TimetableGrid', () => {
  it('renders loading state initially', () => {
    const store = createMockStore({ loading: true });
    render(
      <Provider store={store}>
        <TimetableGrid />
      </Provider>
    );
    expect(screen.getByText('Loading timetable...')).toBeInTheDocument();
  });

  it('renders error state when fetch fails', () => {
    const store = createMockStore({ error: 'Failed to fetch data' });
    render(
      <Provider store={store}>
        <TimetableGrid />
      </Provider>
    );
    expect(screen.getByText('Error: Failed to fetch data')).toBeInTheDocument();
  });

  it('renders timetable grid with data', async () => {
    const store = createMockStore({
      aides: mockTimetableData.aides,
      assignments: mockTimetableData.assignments,
      absences: mockTimetableData.absences,
    });

    render(
      <Provider store={store}>
        <TimetableGrid />
      </Provider>
    );

    // Check if days are rendered
    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('Friday')).toBeInTheDocument();

    // Check if aides are rendered
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();

    // Check if assignment is rendered
    expect(screen.getByText('Math Support')).toBeInTheDocument();

    // Check if time slots are rendered
    expect(screen.getByText('08:00')).toBeInTheDocument();
    expect(screen.getByText('16:00')).toBeInTheDocument();
  });

  it('applies absence styling correctly', () => {
    const store = createMockStore({
      aides: mockTimetableData.aides,
      assignments: mockTimetableData.assignments,
      absences: mockTimetableData.absences,
    });

    render(
      <Provider store={store}>
        <TimetableGrid />
      </Provider>
    );

    // Find Jane Smith's column for Monday (she's absent)
    const absentColumn = screen.getByText('Jane Smith').closest('.aide-column');
    expect(absentColumn).toHaveClass('absent');
  });

  it('shows tooltip on hover for assignments', async () => {
    const store = createMockStore({
      aides: mockTimetableData.aides,
      assignments: mockTimetableData.assignments,
      absences: mockTimetableData.absences,
    });

    render(
      <Provider store={store}>
        <TimetableGrid />
      </Provider>
    );

    const assignment = screen.getByText('Math Support');
    expect(assignment.closest('[data-tooltip]')).toHaveAttribute(
      'data-tooltip',
      'Math Support\n09:00-10:00'
    );
  });

  it('is accessible with ARIA attributes', () => {
    const store = createMockStore({
      aides: mockTimetableData.aides,
      assignments: mockTimetableData.assignments,
      absences: mockTimetableData.absences,
    });

    render(
      <Provider store={store}>
        <TimetableGrid />
      </Provider>
    );

    // Check main grid role
    expect(screen.getByRole('grid')).toHaveAttribute('aria-label', 'Weekly timetable');

    // Check column headers
    expect(screen.getByRole('columnheader')).toHaveTextContent('Monday');

    // Check row headers
    expect(screen.getByRole('rowheader')).toHaveTextContent('08:00');

    // Check grid cells
    const cells = screen.getAllByRole('gridcell');
    expect(cells.length).toBeGreaterThan(0);
  });
}); 