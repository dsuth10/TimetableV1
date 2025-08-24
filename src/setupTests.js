import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock MUI icons to prevent EMFILE errors
vi.mock('@mui/icons-material', () => ({
  ChevronLeft: () => 'ChevronLeft',
  ChevronRight: () => 'ChevronRight',
  Settings: () => 'Settings',
  Add: () => 'Add',
  Edit: () => 'Edit',
  Delete: () => 'Delete',
  Search: () => 'Search',
  FilterList: () => 'FilterList',
  Sort: () => 'Sort',
  Visibility: () => 'Visibility',
  VisibilityOff: () => 'VisibilityOff',
  Close: () => 'Close',
  Check: () => 'Check',
  Warning: () => 'Warning',
  Error: () => 'Error',
  Info: () => 'Info',
  Help: () => 'Help',
  Menu: () => 'Menu',
  MoreVert: () => 'MoreVert',
  ExpandMore: () => 'ExpandMore',
  ExpandLess: () => 'ExpandLess',
  ArrowDropDown: () => 'ArrowDropDown',
  ArrowDropUp: () => 'ArrowDropUp',
  KeyboardArrowDown: () => 'KeyboardArrowDown',
  KeyboardArrowUp: () => 'KeyboardArrowUp',
  KeyboardArrowLeft: () => 'KeyboardArrowLeft',
  KeyboardArrowRight: () => 'KeyboardArrowRight',
}));

// Mock @hello-pangea/dnd consistently across all tests
vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }) => children,
  Droppable: ({ children }) => children({
    provided: { 
      innerRef: vi.fn(), 
      droppableProps: {} 
    },
    placeholder: null,
    snapshot: { isDraggingOver: false }
  }),
  Draggable: ({ children }) => children({
    provided: { 
      innerRef: vi.fn(), 
      draggableProps: {}, 
      dragHandleProps: {} 
    },
    snapshot: { isDragging: false }
  })
}));

// Mock heavy MUI components that might cause issues
vi.mock('@mui/material', () => ({
  ...vi.importActual('@mui/material'),
  // Mock specific components that might cause issues
  CircularProgress: ({ size, ...props }) => (
    <div data-testid="circular-progress" {...props}>
      Loading...
    </div>
  ),
  LinearProgress: ({ variant, ...props }) => (
    <div data-testid="linear-progress" {...props}>
      Progress Bar
    </div>
  ),
}));

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
}); 