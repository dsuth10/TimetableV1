import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { render } from '../../test-utils';
import Schedule from '../Schedule';

// Mock the hooks
vi.mock('../../hooks/useAssignments', () => ({
  useAssignments: () => ({
    assignments: [
      {
        id: 1,
        task_id: 1,
        task_title: 'Test Task',
        task_category: 'CLASS_SUPPORT',
        start_time: '09:00',
        end_time: '09:30',
        date: '2024-01-01',
        aide_id: null,
        aide_name: null,
        classroom_id: null,
        classroom_name: null,
        status: 'UNASSIGNED',
      },
    ],
    isLoading: false,
    error: null,
    updateAssignment: vi.fn(),
  }),
}));

vi.mock('../../hooks/useTeacherAides', () => ({
  useTeacherAides: () => ({
    teacherAides: [
      {
        id: 1,
        name: 'Test Aide',
        email: 'test@example.com',
        phone: '123-456-7890',
        status: 'ACTIVE',
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../hooks/useAbsences', () => ({
  useAbsences: () => ({
    absences: [],
    isLoading: false,
    error: null,
  }),
}));

describe('Drag and Drop Functionality', () => {
  it('should render the schedule component', async () => {
    render(<Schedule />);
    
    // Wait for the component to load and check for the schedule container
    await waitFor(() => {
      expect(screen.getByTestId('schedule-container')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should render unassigned tasks', async () => {
    render(<Schedule />);
    
    // Wait for the unassigned tasks area to load
    await waitFor(() => {
      expect(screen.getByTestId('unassigned-tasks-droppable')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should render timetable grid', async () => {
    render(<Schedule />);
    
    // Wait for the timetable grid to load and look for time slots
    await waitFor(() => {
      // Look for any time slot elements (they have patterns like time-slot-Monday-09:00)
      const timeSlots = screen.getAllByTestId(/^time-slot-/);
      expect(timeSlots.length).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });
});

