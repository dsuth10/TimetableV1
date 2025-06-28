import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import TimetableView from '../TimetableView';
import { getAssignments, updateAssignment } from '../../api/assignments';

// Mock the API functions
jest.mock('../../api/assignments', () => ({
  getAssignments: jest.fn(),
  updateAssignment: jest.fn(),
}));

// Mock react-beautiful-dnd
jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children, onDragEnd }: any) => (
    <div data-testid="drag-drop-context" onClick={() => onDragEnd({
      source: { droppableId: 'unassigned', index: 0 },
      destination: { droppableId: 'MO', index: 0 },
      draggableId: '1'
    })}>
      {children}
    </div>
  ),
  Droppable: ({ children, droppableId }: any) => (
    <div data-testid={`droppable-${droppableId}`}>
      {children({
        draggableProps: {
          style: {},
        },
        innerRef: jest.fn(),
      })}
    </div>
  ),
  Draggable: ({ children, draggableId }: any) => (
    <div data-testid={`draggable-${draggableId}`}>
      {children({
        draggableProps: {
          style: {},
        },
        innerRef: jest.fn(),
        dragHandleProps: {},
      })}
    </div>
  ),
}));

describe('TimetableView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Mock successful API responses with data matching seed.py structure
    (getAssignments as jest.Mock).mockResolvedValue([
      {
        id: 1,
        task_id: 1,
        task_title: "Morning Playground Supervision",
        task_category: "PLAYGROUND",
        start_time: "08:30:00",
        end_time: "09:00:00",
        date: new Date().toISOString().split('T')[0],
        aide_id: 1,
        aide_name: "Sarah Johnson",
        classroom_id: null,
        classroom_name: null,
        status: "UNASSIGNED"
      }
    ]);

    (updateAssignment as jest.Mock).mockResolvedValue({
      id: 1,
      task_id: 1,
      task_title: "Morning Playground Supervision",
      task_category: "PLAYGROUND",
      start_time: "08:30:00",
      end_time: "09:00:00",
      date: new Date().toISOString().split('T')[0],
      aide_id: 1,
      aide_name: "Sarah Johnson",
      classroom_id: null,
      classroom_name: null,
      status: "ASSIGNED"
    });
  });

  it('renders loading state initially', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TimetableView />
      </QueryClientProvider>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders assignments after loading', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TimetableView />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Morning Playground Supervision')).toBeInTheDocument();
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });
  });

  it('handles drag and drop of assignments', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TimetableView />
      </QueryClientProvider>
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('Morning Playground Supervision')).toBeInTheDocument();
    });

    // Find and click the drag drop context to simulate drag end
    const dragDropContext = screen.getByTestId('drag-drop-context');
    fireEvent.click(dragDropContext);

    // Verify that updateAssignment was called with correct parameters
    await waitFor(() => {
      expect(updateAssignment).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        task_id: 1,
        task_title: "Morning Playground Supervision",
        aide_id: 1,
        aide_name: "Sarah Johnson",
        status: "ASSIGNED"
      }));
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock API error
    (getAssignments as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(
      <QueryClientProvider client={queryClient}>
        <TimetableView />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
}); 