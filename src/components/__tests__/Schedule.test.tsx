import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import Schedule from '../Schedule';
import { useAssignments } from '../../hooks/useAssignments';
import { useTeacherAides } from '../../hooks/useTeacherAides';

// Mock the custom hooks
vi.mock('../../hooks/useAssignments');
vi.mock('../../hooks/useTeacherAides');

// Type declarations for mocks
type MockUseAssignments = {
  assignments: Array<{
    id: number;
    task_title: string;
    task_category: string;
    start_time: string;
    end_time: string;
    classroom_name?: string;
    teacher_aide_id: number | null;
    day: string | null;
    time_slot: string | null;
    status: 'UNASSIGNED' | 'ASSIGNED';
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

describe('Schedule Component', () => {
  const mockAssignments = [
    {
      id: 1,
      task_title: 'Math Support',
      task_category: 'ACADEMIC',
      start_time: '9:00',
      end_time: '10:00',
      classroom_name: 'Room 101',
      teacher_aide_id: null,
      day: null,
      time_slot: null,
      status: 'UNASSIGNED' as const
    },
    {
      id: 2,
      task_title: 'Reading Help',
      task_category: 'ACADEMIC',
      start_time: '9:00',
      end_time: '10:00',
      classroom_name: 'Room 102',
      teacher_aide_id: 1,
      day: 'Monday',
      time_slot: '9:00',
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
  });

  it('renders loading state correctly', () => {
    (useAssignments as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({
      assignments: [],
      isLoading: true,
      updateAssignment: vi.fn()
    } as MockUseAssignments);

    render(<Schedule />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders teacher aide schedules and unassigned tasks', () => {
    render(<Schedule />);
    
    // Check for teacher aide name
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    
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

    // Simulate drag and drop
    const unassignedTask = screen.getByText('Math Support');
    const timeSlot = screen.getByTestId('time-slot-Monday-9:00-1');

    fireEvent.dragStart(unassignedTask);
    fireEvent.dragOver(timeSlot);
    fireEvent.drop(timeSlot);

    await waitFor(() => {
      expect(mockUpdateAssignment).toHaveBeenCalledWith(1, expect.objectContaining({
        teacher_aide_id: 1,
        day: 'Monday',
        time_slot: '9:00',
        status: 'ASSIGNED'
      }));
    });
  });

  it('prevents double booking of time slots', async () => {
    const mockUpdateAssignment = vi.fn();
    (useAssignments as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({
      assignments: [
        ...mockAssignments,
        {
          id: 3,
          task_title: 'Science Help',
          task_category: 'ACADEMIC',
          start_time: '9:00',
          end_time: '10:00',
          classroom_name: 'Room 103',
          teacher_aide_id: 1,
          day: 'Monday',
          time_slot: '9:00',
          status: 'ASSIGNED' as const
        }
      ],
      isLoading: false,
      updateAssignment: mockUpdateAssignment
    } as MockUseAssignments);

    render(<Schedule />);

    // Try to drag another task to the same time slot
    const unassignedTask = screen.getByText('Math Support');
    const timeSlot = screen.getByTestId('time-slot-Monday-9:00-1');

    fireEvent.dragStart(unassignedTask);
    fireEvent.dragOver(timeSlot);
    fireEvent.drop(timeSlot);

    await waitFor(() => {
      expect(mockUpdateAssignment).not.toHaveBeenCalled();
    });
  });

  it('handles drag and drop back to unassigned', async () => {
    const mockUpdateAssignment = vi.fn();
    (useAssignments as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({
      assignments: mockAssignments,
      isLoading: false,
      updateAssignment: mockUpdateAssignment
    } as MockUseAssignments);

    render(<Schedule />);

    // Simulate drag and drop back to unassigned
    const assignedTask = screen.getByText('Reading Help');
    const unassignedArea = screen.getByTestId('unassigned-tasks');

    fireEvent.dragStart(assignedTask);
    fireEvent.dragOver(unassignedArea);
    fireEvent.drop(unassignedArea);

    await waitFor(() => {
      expect(mockUpdateAssignment).toHaveBeenCalledWith(2, expect.objectContaining({
        teacher_aide_id: null,
        status: 'UNASSIGNED'
      }));
    });
  });

  it('handles server update failure gracefully', async () => {
    const mockUpdateAssignment = vi.fn().mockRejectedValue(new Error('Update failed'));
    (useAssignments as unknown as { mockReturnValue: (v: any) => void }).mockReturnValue({
      assignments: mockAssignments,
      isLoading: false,
      updateAssignment: mockUpdateAssignment
    } as MockUseAssignments);

    render(<Schedule />);

    // Simulate drag and drop
    const unassignedTask = screen.getByText('Math Support');
    const timeSlot = screen.getByTestId('time-slot-Monday-9:00-1');

    fireEvent.dragStart(unassignedTask);
    fireEvent.dragOver(timeSlot);
    fireEvent.drop(timeSlot);

    await waitFor(() => {
      // Task should remain in unassigned area after failed update
      expect(screen.getByText('Math Support')).toBeInTheDocument();
    });
  });
}); 