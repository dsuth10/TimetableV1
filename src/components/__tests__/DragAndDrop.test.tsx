import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
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
  it('should render the schedule component', () => {
    render(<Schedule />);
    expect(screen.getByTestId('schedule-container')).toBeInTheDocument();
  });

  it('should render unassigned tasks', () => {
    render(<Schedule />);
    expect(screen.getByTestId('unassigned-tasks-droppable')).toBeInTheDocument();
  });

  it('should render timetable grid', () => {
    render(<Schedule />);
    // Look for a time slot in the grid
    expect(screen.getByTestId(/time-slot-/)).toBeInTheDocument();
  });
});

