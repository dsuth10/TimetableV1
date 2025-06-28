# Drag and Drop Implementation Plan

## Overview
This document outlines the implementation plan for adding drag and drop functionality to the schedule screen, allowing tasks to be dragged from the unassigned task list to the teacher aide timetables.

## Core Requirements
- Tasks can be dragged from the right panel to timetable slots
- Time-constrained tasks can only be dropped in their specified time slots
- Flexible tasks (no set times) can be dropped anywhere
- Task blocks in the schedule must represent the task's duration
- Visual feedback during drag and drop operations
- Conflict resolution for overlapping assignments

## Technical Implementation

### 1. Frontend Structure ✅
```typescript
// frontend/src/types/assignment.ts
interface Assignment {
  id: number;
  task_id: number;
  task_title: string;
  task_category: string;
  start_time: string;
  end_time: string;
  date: string;
  aide_id: number;
  aide_name: string;
  classroom_id: number | null;
  classroom_name: string | null;
  status: 'ASSIGNED' | 'UNASSIGNED';
}
```

### 2. API Integration ✅
```typescript
// frontend/src/api/assignments.ts
export const getAssignments = async (): Promise<Assignment[]> => {
  const response = await fetch(`${API_BASE_URL}/assignments`);
  if (!response.ok) {
    throw new Error('Failed to fetch assignments');
  }
  return response.json();
};

export const updateAssignment = async (assignment: Assignment): Promise<Assignment> => {
  const response = await fetch(`${API_BASE_URL}/assignments/${assignment.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(assignment),
  });
  if (!response.ok) {
    throw new Error('Failed to update assignment');
  }
  return response.json();
};
```

### 3. TimetableView Component ✅
```typescript
// frontend/src/components/TimetableView.tsx
const TimetableView: React.FC = () => {
  const queryClient = useQueryClient();
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const { data: assignmentsData, isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: getAssignments,
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: updateAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    const assignmentId = parseInt(draggableId);
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    const updatedAssignment = {
      ...assignment,
      date: destination.droppableId,
      status: 'ASSIGNED',
    };

    updateAssignmentMutation.mutate(updatedAssignment);
  };
};
```

### 4. Project Configuration ✅
```json
// frontend/package.json
{
  "dependencies": {
    "@emotion/react": "^11.11.3",
    "@emotion/styled": "^11.11.0",
    "@mui/material": "^5.15.10",
    "@tanstack/react-query": "^5.20.5",
    "react": "^18.2.0",
    "react-beautiful-dnd": "^13.1.1",
    "react-dom": "^18.2.0",
    "typescript": "^5.3.3"
  }
}
```

## Implementation Status

### Completed ✅
1. Basic project structure setup
   - TypeScript configuration
   - Vite build system
   - Material-UI integration
   - React Query setup

2. Core Components
   - TimetableView with drag-and-drop
   - Assignment type definitions
   - API integration layer

3. Development Environment
   - Development server configuration
   - API proxy setup
   - Type checking

4. Testing Infrastructure
   - Jest and React Testing Library setup
   - Mock implementations for react-beautiful-dnd
   - Test cases for drag and drop functionality
   - Error handling tests

5. Seed Data
   - Comprehensive task creation
   - Various task types (flexible and time-constrained)
   - Different time slots and recurrence patterns
   - Mix of assigned and unassigned tasks

### In Progress 🚧
1. Backend Integration
   - Assignment endpoints
   - Conflict resolution
   - Validation logic

2. Enhanced Features
   - Time constraint validation
   - Visual feedback improvements
   - Error handling

### Pending ⏳
1. Testing
   - Integration tests
   - End-to-end tests

2. Polish
   - Animations
   - Loading states
   - Error messages
   - Documentation

## Test Implementation Details

### 1. Mock Setup
```typescript
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
  // ... other mock implementations
}));
```

### 2. Test Cases
- Loading state verification
- Assignment rendering
- Drag and drop functionality
- Error handling
- API integration

### 3. Seed Data Structure
```python
tasks = [
    # Flexible task
    Task(
        title="Morning Playground Supervision",
        category="PLAYGROUND",
        start_time=time(8, 30),
        end_time=time(9, 0),
        recurrence_rule="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
        is_flexible=True
    ),
    # Classroom-specific task
    Task(
        title="Math Class Support",
        category="CLASS_SUPPORT",
        start_time=time(10, 0),
        end_time=time(11, 0),
        classroom_id=classrooms[0].id,
        recurrence_rule="FREQ=WEEKLY;BYDAY=MO,WE,FR",
        is_flexible=False
    ),
    # ... more task variations
]
```

## Next Steps

1. **Backend Development**
   - Implement assignment endpoints
   - Add validation logic
   - Set up conflict detection

2. **Frontend Enhancement**
   - Add loading states
   - Improve error handling
   - Enhance visual feedback

3. **Testing**
   - Write integration tests
   - Add end-to-end tests
   - Create user acceptance tests

## Recent Updates

- **Task Model Enhancement**: Added an `is_flexible` Boolean column to the `Task` model to distinguish flexible tasks (no set time or location) from time-constrained tasks.
- **Assignments Route Refactor**: Updated the assignments route to use the new session management system with `managed_session()` instead of direct `db_session` usage.
- **Standardized Error Responses**: Created `api/utils.py` with the `error_response` function to provide consistent JSON error payloads across the API.
- **Backend Server Fix**: Removed the problematic block in `api/routes/__init__.py` that attempted to log registered routes using `api_bp.url_map`, resolving the AttributeError. The backend server now starts successfully.
- **Frontend Development Server**: Successfully launched the frontend development server, accessible at http://localhost:5173/, allowing for testing of the drag-and-drop schedule UI and API integration.

## Dependencies
- react-beautiful-dnd (for drag and drop)
- @mui/material (for UI components)
- @tanstack/react-query (for data fetching)
- TypeScript (for type safety)
- Jest and React Testing Library (for testing)

## Notes
- The frontend is set up with a modern development environment
- Drag and drop functionality is implemented using react-beautiful-dnd
- State management is handled through React Query
- Material-UI provides consistent styling
- TypeScript ensures type safety throughout the application
- Comprehensive test suite covers core functionality
- Seed data provides various test scenarios 