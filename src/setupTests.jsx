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
  Droppable: ({ children }) => {
    const provided = { 
      innerRef: vi.fn(), 
      droppableProps: {} 
    };
    const snapshot = { 
      isDraggingOver: false, 
      draggingFromThisWith: null, 
      draggingOverWith: null 
    };
    const placeholder = null;
    
    // Call children function with the expected parameters
    return children(provided, snapshot);
  },
  Draggable: ({ children }) => {
    const provided = { 
      innerRef: vi.fn(), 
      draggableProps: {}, 
      dragHandleProps: {} 
    };
    const snapshot = { 
      isDragging: false, 
      draggingOver: null, 
      dropAnimation: null, 
      isDropAnimating: false 
    };
    
    // Call children function with the expected parameters
    return children(provided, snapshot);
  }
}));

// Mock MUI material components properly
vi.mock('@mui/material', () => ({
  Box: ({ children, sx, ...props }) => (
    <div data-testid="mui-box" style={sx} {...props}>
      {children}
    </div>
  ),
  AppBar: ({ children, position, ...props }) => (
    <header data-testid="mui-appbar" {...props}>
      {children}
    </header>
  ),
  Toolbar: ({ children, ...props }) => (
    <div data-testid="mui-toolbar" {...props}>
      {children}
    </div>
  ),
  Typography: ({ children, variant, ...props }) => (
    <div data-testid="mui-typography" data-variant={variant} {...props}>
      {children}
    </div>
  ),
  Button: ({ children, variant, color, ...props }) => (
    <button data-testid="mui-button" data-variant={variant} data-color={color} {...props}>
      {children}
    </button>
  ),
  IconButton: ({ children, ...props }) => (
    <button data-testid="mui-iconbutton" {...props}>
      {children}
    </button>
  ),
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
  Container: ({ children, maxWidth, ...props }) => (
    <div data-testid="mui-container" data-maxwidth={maxWidth} {...props}>
      {children}
    </div>
  ),
  Grid: ({ children, container, item, spacing, ...props }) => (
    <div data-testid="mui-grid" data-container={container} data-item={item} data-spacing={spacing} {...props}>
      {children}
    </div>
  ),
  Paper: ({ children, elevation, ...props }) => (
    <div data-testid="mui-paper" data-elevation={elevation} {...props}>
      {children}
    </div>
  ),
  Card: ({ children, ...props }) => (
    <div data-testid="mui-card" {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children, ...props }) => (
    <div data-testid="mui-cardcontent" {...props}>
      {children}
    </div>
  ),
  List: ({ children, ...props }) => (
    <ul data-testid="mui-list" {...props}>
      {children}
    </ul>
  ),
  ListItem: ({ children, ...props }) => (
    <li data-testid="mui-listitem" {...props}>
      {children}
    </li>
  ),
  ListItemText: ({ primary, secondary, ...props }) => (
    <div data-testid="mui-listitemtext" {...props}>
      {primary && <div data-testid="primary">{primary}</div>}
      {secondary && <div data-testid="secondary">{secondary}</div>}
    </div>
  ),
  Chip: ({ label, color, variant, ...props }) => (
    <span data-testid="mui-chip" data-color={color} data-variant={variant} {...props}>
      {label}
    </span>
  ),
  TextField: ({ label, value, onChange, fullWidth, select, children, ...props }) => {
    if (select) {
      return (
        <div>
          {label && <label>{label}</label>}
          <select value={value || ''} onChange={onChange} {...props}>
            {children}
          </select>
        </div>
      );
    }
    return (
      <div>
        {label && <label>{label}</label>}
        <input
          type="text"
          value={value || ''}
          onChange={onChange}
          {...props}
        />
      </div>
    );
  },
  Select: ({ children, value, onChange, ...props }) => (
    <select data-testid="mui-select" value={value} onChange={onChange} {...props}>
      {children}
    </select>
  ),
  MenuItem: ({ children, value, ...props }) => (
    <option data-testid="mui-menuitem" value={value} {...props}>
      {children}
    </option>
  ),
  FormControl: ({ children, ...props }) => (
    <div data-testid="mui-formcontrol" {...props}>
      {children}
    </div>
  ),
  InputLabel: ({ children, ...props }) => (
    <label data-testid="mui-inputlabel" {...props}>
      {children}
    </label>
  ),
  Alert: ({ children, severity, ...props }) => (
    <div data-testid="mui-alert" data-severity={severity} {...props}>
      {children}
    </div>
  ),
  AlertTitle: ({ children, ...props }) => (
    <div data-testid="mui-alerttitle" {...props}>
      {children}
    </div>
  ),
  Snackbar: ({ children, open, onClose, ...props }) => (
    open ? (
      <div data-testid="mui-snackbar" {...props}>
        {children}
      </div>
    ) : null
  ),
  Dialog: ({ children, open, onClose, ...props }) => (
    open ? (
      <div data-testid="mui-dialog" {...props}>
        {children}
      </div>
    ) : null
  ),
  DialogTitle: ({ children, ...props }) => (
    <div data-testid="mui-dialogtitle" {...props}>
      {children}
    </div>
  ),
  DialogContent: ({ children, ...props }) => (
    <div data-testid="mui-dialogcontent" {...props}>
      {children}
    </div>
  ),
  DialogActions: ({ children, ...props }) => (
    <div data-testid="mui-dialogactions" {...props}>
      {children}
    </div>
  ),
}));

// Mock axios properly
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    })),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
  // Also mock the named export
  create: vi.fn(() => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  }))
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