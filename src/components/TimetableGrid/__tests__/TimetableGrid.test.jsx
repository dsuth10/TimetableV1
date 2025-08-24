import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import TimetableGrid from '../TimetableGrid';

// Mock @hello-pangea/dnd to avoid Redux version conflicts
vi.mock('@hello-pangea/dnd', () => ({
  Droppable: ({ children, droppableId }) => 
    children(
      { 
        provided: { 
          innerRef: vi.fn(), 
          droppableProps: {} 
        }, 
        placeholder: null,
        snapshot: { isDraggingOver: false }
      },
      {}
    ),
  Draggable: ({ children, draggableId }) => 
    children(
      { 
        provided: { 
          innerRef: vi.fn(), 
          draggableProps: {}, 
          dragHandleProps: {} 
        }, 
        snapshot: { isDragging: false }
      },
      {}
    ),
}));

const mockTeacherAides = [
  { id: 1, name: 'John Doe', colour_hex: '#4CAF50' },
  { id: 2, name: 'Jane Smith', colour_hex: '#2196F3' },
];

const mockAssignments = [
  {
    id: 1,
    aide_id: 1,
    date: '2024-01-01', // Monday (January 1, 2024 is a Monday)
    start_time: '09:00',
    end_time: '10:00',
    task_title: 'Math Support',
    task_category: 'CLASS_SUPPORT',
    status: 'ASSIGNED',
  },
];

const mockAbsences = [
  {
    id: 1,
    aide_id: 2,
    start_date: '2024-01-01',
    end_date: '2024-01-05', // Cover the whole week
    reason: 'Sick leave',
  },
];

describe('TimetableGrid', () => {
  it('renders loading state initially', () => {
    render(
      <TimetableGrid 
        assignments={[]}
        teacherAides={[]}
        isLoading={true}
        absences={[]}
        renderKey={0}
        weekStartDate={new Date('2024-01-01')}
      />
    );
    expect(screen.getByText('Loading timetable...')).toBeInTheDocument();
  });

  it('renders timetable grid with data', () => {
    render(
      <TimetableGrid 
        assignments={mockAssignments}
        teacherAides={mockTeacherAides}
        isLoading={false}
        absences={mockAbsences}
        renderKey={0}
        weekStartDate={new Date('2024-01-01')}
      />
    );

    // Check if days are rendered
    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('Friday')).toBeInTheDocument();

    // Check if aide columns are rendered by looking for their data-testid attributes
    // Each aide should have time slots for each day
    expect(screen.getByTestId('time-slot-1-Monday-08:00')).toBeInTheDocument(); // John Doe
    expect(screen.getByTestId('time-slot-2-Monday-08:00')).toBeInTheDocument(); // Jane Smith
    
    // Check if time slots are rendered
    expect(screen.getByText('08:00')).toBeInTheDocument();
    expect(screen.getByText('16:00')).toBeInTheDocument();
  });

  it('applies absence styling correctly', () => {
    render(
      <TimetableGrid 
        assignments={mockAssignments}
        teacherAides={mockTeacherAides}
        isLoading={false}
        absences={mockAbsences}
        renderKey={0}
        weekStartDate={new Date('2024-01-01')}
      />
    );

    // Find Jane Smith's column for Monday (she's absent) by looking for her time slot
    // Use getAllByTestId since there might be multiple renders
    const janeSmithMondaySlots = screen.getAllByTestId('time-slot-2-Monday-08:00');
    const janeSmithMondayColumn = janeSmithMondaySlots[0].closest('.aide-column');
    
    // Check if the absence styling is applied
    expect(janeSmithMondayColumn).toHaveClass('absent');
  });

  it('shows tooltip on hover for assignments', () => {
    render(
      <TimetableGrid 
        assignments={mockAssignments}
        teacherAides={mockTeacherAides}
        isLoading={false}
        absences={mockAbsences}
        renderKey={0}
        weekStartDate={new Date('2024-01-01')}
      />
    );

    // Look for the assignment using data-testid since it should be rendered in the time slot
    // Use getAllByTestId since there might be multiple renders
    const assignmentSlots = screen.getAllByTestId('time-slot-1-Monday-09:00');
    expect(assignmentSlots[0]).toHaveAttribute(
      'data-tooltip',
      'Math Support\n09:00-10:00\nNotes: N/A'
    );
  });

  it('is accessible with ARIA attributes', () => {
    render(
      <TimetableGrid 
        assignments={mockAssignments}
        teacherAides={mockTeacherAides}
        isLoading={false}
        absences={mockAbsences}
        renderKey={0}
        weekStartDate={new Date('2024-01-01')}
      />
    );

    // Check main grid role - use getAllByRole since there might be multiple renders
    const grids = screen.getAllByRole('grid');
    expect(grids[0]).toHaveAttribute('aria-label', 'Weekly timetable');

    // Check column headers - there should be 5 unique days (Monday through Friday)
    // Since there might be multiple renders, we need to count unique content
    const columnHeaders = screen.getAllByRole('columnheader');
    const uniqueDays = [...new Set(columnHeaders.map(header => header.textContent))];
    expect(uniqueDays).toHaveLength(5); // Monday through Friday
    expect(uniqueDays).toContain('Monday');
    expect(uniqueDays).toContain('Friday');

    // Check row headers (time slots) - there should be 17 unique times
    const rowHeaders = screen.getAllByRole('rowheader');
    const uniqueTimes = [...new Set(rowHeaders.map(header => header.textContent))];
    expect(uniqueTimes).toHaveLength(17); // 8:00 to 16:00 in 30-minute intervals
    expect(uniqueTimes).toContain('08:00');
    expect(uniqueTimes).toContain('16:00');

    // Check grid cells
    const gridCells = screen.getAllByRole('gridcell');
    expect(gridCells.length).toBeGreaterThan(0);
  });
}); 