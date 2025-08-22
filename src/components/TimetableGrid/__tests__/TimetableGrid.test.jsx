import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import TimetableGrid from '../TimetableGrid';

// Mock react-beautiful-dnd to avoid Redux version conflicts
vi.mock('react-beautiful-dnd', () => ({
  default: {
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
  },
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
    day: 'Monday',
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
      />
    );

    // Check if days are rendered
    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('Friday')).toBeInTheDocument();

    // Check if aides are rendered (use getAllByText since they appear multiple times)
    const johnDoeElements = screen.getAllByText('John Doe');
    const janeSmithElements = screen.getAllByText('Jane Smith');
    expect(johnDoeElements.length).toBeGreaterThan(0);
    expect(janeSmithElements.length).toBeGreaterThan(0);

    // Check if assignment is rendered (use getAllByText since it appears multiple times)
    const mathSupportElements = screen.getAllByText('Math Support');
    expect(mathSupportElements.length).toBeGreaterThan(0);

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
      />
    );

    // Find Jane Smith's column for Monday (she's absent) - use first occurrence
    const janeSmithElements = screen.getAllByText('Jane Smith');
    const absentColumn = janeSmithElements[0].closest('.aide-column');
    expect(absentColumn).toHaveClass('absent');
  });

  it('shows tooltip on hover for assignments', () => {
    render(
      <TimetableGrid 
        assignments={mockAssignments}
        teacherAides={mockTeacherAides}
        isLoading={false}
        absences={mockAbsences}
      />
    );

    const assignment = screen.getAllByText('Math Support')[0];
    expect(assignment.closest('[data-tooltip]')).toHaveAttribute(
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
      />
    );

    // Check main grid role
    expect(screen.getByRole('grid')).toHaveAttribute('aria-label', 'Weekly timetable');

    // Check column headers (use getAllByRole since there are multiple)
    const columnHeaders = screen.getAllByRole('columnheader');
    expect(columnHeaders[0]).toHaveTextContent('Monday');

    // Check row headers (use getAllByRole since there are multiple)
    const rowHeaders = screen.getAllByRole('rowheader');
    expect(rowHeaders[0]).toHaveTextContent('08:00');

    // Check grid cells
    const cells = screen.getAllByRole('gridcell');
    expect(cells.length).toBeGreaterThan(0);
  });
}); 