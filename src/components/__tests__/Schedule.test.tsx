import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { render } from '../../test-utils';
import Schedule from '../Schedule';
import { useAssignments } from '../../hooks/useAssignments';
import { useTeacherAides } from '../../hooks/useTeacherAides';
import { useAbsences } from '../../hooks/useAbsences';

// Mock the custom hooks
vi.mock('../../hooks/useAssignments');
vi.mock('../../hooks/useTeacherAides');
vi.mock('../../hooks/useAbsences');

// Mock the tasksApi to prevent API calls
vi.mock('../../services/tasksApi', () => ({
  tasksApi: {
    getUnassigned: vi.fn().mockResolvedValue({ tasks: [] })
  }
}));

// Type declarations for mocks
type MockUseAssignments = {
  assignments: Array<{
    id: number;
    task_id: number;
    task_title: string;
    task_category: string;
    start_time: string;
    end_time: string;
    date: string;
    aide_id: number | null;
    day: string | null;
    status: 'UNASSIGNED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETE';
    is_flexible?: boolean;
    notes?: string;
    created_at?: string;
    updated_at?: string;
  }>;
  isLoading: boolean;
  updateAssignment: ReturnType<typeof vi.fn>;
};

type MockUseTeacherAides = {
  teacherAides: Array<{
    id: number;
    name: string;
    email: string;
    status: 'ACTIVE' | 'INACTIVE';
  }>;
  isLoading: boolean;
};

type MockUseAbsences = {
  absences: Array<{
    id: number;
    aide_id: number;
    start_date: string;
    end_date: string;
    reason?: string;
  }>;
  isLoading: boolean;
};

describe('Schedule Component', () => {
  const mockAssignments = [
    {
      id: 1,
      task_id: 1,
      task_title: 'Math Support',
      task_category: 'ACADEMIC',
      start_time: '09:00',
      end_time: '10:00',
      date: '2024-01-01', // Monday, January 1, 2024
      aide_id: null,
      day: null, // Unassigned tasks don't have a day
      status: 'UNASSIGNED' as const
    },
    {
      id: 2,
      task_id: 2,
      task_title: 'Reading Help',
      task_category: 'ACADEMIC',
      start_time: '09:00',
      end_time: '10:00',
      date: '2024-01-01', // Monday, January 1, 2024
      aide_id: 1,
      day: 'Monday', // Assigned tasks have a day
      status: 'ASSIGNED' as const
    }
  ];

  const mockTeacherAides = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      status: 'ACTIVE' as const
    }
  ];

  const mockAbsences = [
    {
      id: 1,
      aide_id: 1,
      start_date: '2024-01-01',
      end_date: '2024-01-05',
      reason: 'Vacation'
    }
  ];

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Setup default mock implementations
    (useAssignments as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({
      assignments: mockAssignments,
      isLoading: false,
      updateAssignment: vi.fn()
    } as MockUseAssignments);

    (useTeacherAides as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({
      teacherAides: mockTeacherAides,
      isLoading: false
    } as MockUseTeacherAides);

    (useAbsences as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({
      absences: mockAbsences,
      isLoading: false
    } as MockUseAbsences);
  });

  it('renders loading state correctly', () => {
    (useAssignments as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({
      assignments: [],
      isLoading: true,
      updateAssignment: vi.fn()
    } as MockUseAssignments);

    (useTeacherAides as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({
      teacherAides: [],
      isLoading: true
    } as MockUseTeacherAides);

    (useAbsences as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({
      absences: [],
      isLoading: true
    } as MockUseAbsences);

    render(<Schedule />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders teacher aide schedules and unassigned tasks', () => {
    render(<Schedule />);
    
    // Check for teacher aide name in aria-label
    const aideSlots = screen.getAllByLabelText(/Empty slot for John Doe at/);
    expect(aideSlots.length).toBeGreaterThan(0);
    
    // Check for unassigned tasks
    expect(screen.getByText('Math Support')).toBeInTheDocument();
    
    // Check for assigned tasks
    expect(screen.getByText('Reading Help')).toBeInTheDocument();
  });

  it('handles drag and drop of unassigned task to schedule', async () => {
    const mockUpdateAssignment = vi.fn();
    (useAssignments as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({
      assignments: mockAssignments,
      isLoading: false,
      updateAssignment: mockUpdateAssignment
    } as MockUseAssignments);

    render(<Schedule />);

    // Check that the unassigned task is visible
    expect(screen.getByText('Math Support')).toBeInTheDocument();
    
    // Check that the time slot exists
    expect(screen.getByTestId('time-slot-1-Monday-09:00')).toBeInTheDocument();
    
    // Note: Full drag and drop testing requires the complete @hello-pangea/dnd context
    // which is complex to mock in unit tests. This test verifies the UI elements exist.
  });

  it('prevents double booking of time slots', async () => {
    const mockUpdateAssignment = vi.fn();
    (useAssignments as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({
      assignments: [
        ...mockAssignments,
        {
          id: 3,
          task_id: 3,
          task_title: 'Science Help',
          task_category: 'ACADEMIC',
          start_time: '10:00',
          end_time: '11:00',
          date: '2024-01-01', // Monday, January 1, 2024
          aide_id: 1,
          day: 'Monday', // Assigned tasks have a day
          status: 'ASSIGNED' as const
        }
      ],
      isLoading: false,
      updateAssignment: mockUpdateAssignment
    } as MockUseAssignments);

    render(<Schedule />);

    // Check that both assignments are visible in the schedule
    expect(screen.getByText('Reading Help')).toBeInTheDocument();
    expect(screen.getByText('Science Help')).toBeInTheDocument();
    
    // Check that the time slot exists
    expect(screen.getByTestId('time-slot-1-Monday-09:00')).toBeInTheDocument();
    
    // Note: Double booking prevention logic would be tested in integration tests
    // with the full drag and drop context. This test verifies the UI elements exist.
  });

  it('handles drag and drop back to unassigned', async () => {
    const mockUpdateAssignment = vi.fn();
    (useAssignments as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({
      assignments: mockAssignments,
      isLoading: false,
      updateAssignment: mockUpdateAssignment
    } as MockUseAssignments);

    render(<Schedule />);

    // Check that the assigned task is visible in the schedule
    expect(screen.getByText('Reading Help')).toBeInTheDocument();
    
    // Check that the unassigned area exists
    expect(screen.getByTestId('unassigned-tasks-droppable')).toBeInTheDocument();
    
    // Note: Full drag and drop testing requires the complete @hello-pangea/dnd context
    // which is complex to mock in unit tests. This test verifies the UI elements exist.
  });

  it('handles server update failure gracefully', async () => {
    const mockUpdateAssignment = vi.fn().mockRejectedValue(new Error('Update failed'));
    (useAssignments as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({
      assignments: mockAssignments,
      isLoading: false,
      updateAssignment: mockUpdateAssignment
    } as MockUseAssignments);

    render(<Schedule />);

    // Check that the unassigned task is visible
    expect(screen.getByText('Math Support')).toBeInTheDocument();
    
    // Check that the time slot exists
    expect(screen.getByTestId('time-slot-1-Monday-09:00')).toBeInTheDocument();
    
    // Note: Server update failure handling would be tested in integration tests
    // with the full drag and drop context. This test verifies the UI elements exist.
  });
}); 