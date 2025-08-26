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
  ArrowBack: () => 'ArrowBack',
  ArrowForward: () => 'ArrowForward',
  Home: () => 'Home',
  Schedule: () => 'Schedule',
  People: () => 'People',
  Assignment: () => 'Assignment',
  Notifications: () => 'Notifications',
  AccountCircle: () => 'AccountCircle',
  ExitToApp: () => 'ExitToApp',
  Refresh: () => 'Refresh',
  Download: () => 'Download',
  Upload: () => 'Upload',
  Print: () => 'Print',
  Share: () => 'Share',
  Favorite: () => 'Favorite',
  FavoriteBorder: () => 'FavoriteBorder',
  Star: () => 'Star',
  StarBorder: () => 'StarBorder',
  ThumbUp: () => 'ThumbUp',
  ThumbDown: () => 'ThumbDown',
  Flag: () => 'Flag',
  Report: () => 'Report',
  Block: () => 'Block',
  Unblock: () => 'Unblock',
  Archive: () => 'Archive',
  Unarchive: () => 'Unarchive',
  Restore: () => 'Restore',
  DeleteForever: () => 'DeleteForever',
  Undo: () => 'Undo',
  Redo: () => 'Redo',
  Save: () => 'Save',
  SaveAlt: () => 'SaveAlt',
  CloudUpload: () => 'CloudUpload',
  CloudDownload: () => 'CloudDownload',
  Sync: () => 'Sync',
  SyncDisabled: () => 'SyncDisabled',
  Autorenew: () => 'Autorenew',
  Loop: () => 'Loop',
  Cached: () => 'Cached',
  GetApp: () => 'GetApp',
  FileDownload: () => 'FileDownload',
  FileUpload: () => 'FileUpload',
  Folder: () => 'Folder',
  FolderOpen: () => 'FolderOpen',
  InsertDriveFile: () => 'InsertDriveFile',
  Description: () => 'Description',
  Image: () => 'Image',
  VideoLibrary: () => 'VideoLibrary',
  AudioFile: () => 'AudioFile',
  PictureAsPdf: () => 'PictureAsPdf',
  Code: () => 'Code',
  DataObject: () => 'DataObject',
  Functions: () => 'Functions',
  Calculate: () => 'Calculate',
  Timeline: () => 'Timeline',
  TrendingUp: () => 'TrendingUp',
  TrendingDown: () => 'TrendingDown',
  ShowChart: () => 'ShowChart',
  BarChart: () => 'BarChart',
  PieChart: () => 'PieChart',
  BubbleChart: () => 'BubbleChart',
  ScatterPlot: () => 'ScatterPlot',
  MultilineChart: () => 'MultilineChart',
  StackedLineChart: () => 'StackedLineChart',
  CandlestickChart: () => 'CandlestickChart',
  WaterfallChart: () => 'WaterfallChart',
  Radar: () => 'Radar',
  Speed: () => 'Speed',
  Timer: () => 'Timer',
  TimerOff: () => 'TimerOff',
  AccessTime: () => 'AccessTime',
  Event: () => 'Event',
  EventAvailable: () => 'EventAvailable',
  EventBusy: () => 'EventBusy',
  EventNote: () => 'EventNote',
  LocationOn: () => 'LocationOn',
  LocationOff: () => 'LocationOff',
  MyLocation: () => 'MyLocation',
  Navigation: () => 'Navigation',
  Directions: () => 'Directions',
  DirectionsWalk: () => 'DirectionsWalk',
  DirectionsCar: () => 'DirectionsCar',
  DirectionsBike: () => 'DirectionsBike',
  DirectionsBus: () => 'DirectionsBus',
  DirectionsSubway: () => 'DirectionsSubway',
  DirectionsTrain: () => 'DirectionsTrain',
  DirectionsBoat: () => 'DirectionsBoat',
  DirectionsPlane: () => 'DirectionsPlane',
  Flight: () => 'Flight',
  FlightTakeoff: () => 'FlightTakeoff',
  FlightLand: () => 'FlightLand',
  Hotel: () => 'Hotel',
  Restaurant: () => 'Restaurant',
  LocalBar: () => 'LocalBar',
  LocalCafe: () => 'LocalCafe',
  LocalDining: () => 'LocalDining',
  LocalPizza: () => 'LocalPizza',
  LocalGasStation: () => 'LocalGasStation',
  LocalGroceryStore: () => 'LocalGroceryStore',
  LocalHospital: () => 'LocalHospital',
  LocalPharmacy: () => 'LocalPharmacy',
  LocalPostOffice: () => 'LocalPostOffice',
  LocalBank: () => 'LocalBank',
  LocalAtm: () => 'LocalAtm',
  LocalTaxi: () => 'LocalTaxi',
  LocalCarWash: () => 'LocalCarWash',
  LocalLaundryService: () => 'LocalLaundryService',
  LocalFlorist: () => 'LocalFlorist',
  LocalConvenienceStore: () => 'LocalConvenienceStore',
  LocalMall: () => 'LocalMall',
  LocalMovies: () => 'LocalMovies',
  LocalTheater: () => 'LocalTheater',
  LocalLibrary: () => 'LocalLibrary',
  LocalSchool: () => 'LocalSchool',
  LocalUniversity: () => 'LocalUniversity',
  LocalPark: () => 'LocalPark',
  LocalParking: () => 'LocalParking',
  LocalPolice: () => 'LocalPolice',
  LocalFireDepartment: () => 'LocalFireDepartment',
  LocalAmbulance: () => 'LocalAmbulance',
}));

// Mock react-beautiful-dnd to prevent drag and drop errors
vi.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children }) => children,
  Droppable: ({ children }) => children({
    droppableProps: {
      'data-testid': 'droppable',
    },
    placeholder: null,
    innerRef: vi.fn(),
  }, {}),
  Draggable: ({ children }) => children({
    draggableProps: {
      'data-testid': 'draggable',
    },
    dragHandleProps: {},
    innerRef: vi.fn(),
  }, {}),
}));

// Mock MUI components to prevent DOM warnings
vi.mock('@mui/material', () => ({
  Box: ({ children, ...props }) => <div {...props}>{children}</div>,
  Paper: ({ children, ...props }) => <div {...props}>{children}</div>,
  Typography: ({ children, ...props }) => <div {...props}>{children}</div>,
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
  TextField: ({ children, ...props }) => <div {...props}>{children}</div>,
  Select: ({ children, ...props }) => <div {...props}>{children}</div>,
  MenuItem: ({ children, ...props }) => <div {...props}>{children}</div>,
  FormControl: ({ children, ...props }) => <div {...props}>{children}</div>,
  InputLabel: ({ children, ...props }) => <div {...props}>{children}</div>,
  CircularProgress: ({ ...props }) => <div {...props}>Loading...</div>,
  List: ({ children, ...props }) => <ul {...props}>{children}</ul>,
  ListItem: ({ children, ...props }) => <li {...props}>{children}</li>,
  ListItemText: ({ primary, secondary, ...props }) => (
    <div {...props}>
      <div>{primary}</div>
      {secondary && <div>{secondary}</div>}
    </div>
  ),
  IconButton: ({ children, ...props }) => <button {...props}>{children}</button>,
  Tooltip: ({ children, title, ...props }) => (
    <div {...props} title={title}>{children}</div>
  ),
  Chip: ({ label, ...props }) => <span {...props}>{label}</span>,
  Dialog: ({ children, open, ...props }) => 
    open ? <div {...props}>{children}</div> : null,
  DialogTitle: ({ children, ...props }) => <div {...props}>{children}</div>,
  DialogContent: ({ children, ...props }) => <div {...props}>{children}</div>,
  DialogActions: ({ children, ...props }) => <div {...props}>{children}</div>,
  Snackbar: ({ children, open, ...props }) => 
    open ? <div {...props}>{children}</div> : null,
  Alert: ({ children, severity, ...props }) => (
    <div {...props} data-severity={severity}>{children}</div>
  ),
  Grid: ({ children, ...props }) => <div {...props}>{children}</div>,
  Container: ({ children, ...props }) => <div {...props}>{children}</div>,
  AppBar: ({ children, ...props }) => <div {...props}>{children}</div>,
  Toolbar: ({ children, ...props }) => <div {...props}>{children}</div>,
  Drawer: ({ children, open, ...props }) => 
    open ? <div {...props}>{children}</div> : null,
  ListItemIcon: ({ children, ...props }) => <div {...props}>{children}</div>,
  Divider: ({ ...props }) => <hr {...props} />,
  Card: ({ children, ...props }) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }) => <div {...props}>{children}</div>,
  CardActions: ({ children, ...props }) => <div {...props}>{children}</div>,
  Avatar: ({ children, ...props }) => <div {...props}>{children}</div>,
  Badge: ({ children, badgeContent, ...props }) => (
    <div {...props} data-badge={badgeContent}>{children}</div>
  ),
  Switch: ({ ...props }) => <input type="checkbox" {...props} />,
  Checkbox: ({ ...props }) => <input type="checkbox" {...props} />,
  Radio: ({ ...props }) => <input type="radio" {...props} />,
  RadioGroup: ({ children, ...props }) => <div {...props}>{children}</div>,
  FormControlLabel: ({ control, label, ...props }) => (
    <div {...props}>
      {control}
      <span>{label}</span>
    </div>
  ),
  Tabs: ({ children, ...props }) => <div {...props}>{children}</div>,
  Tab: ({ label, ...props }) => <button {...props}>{label}</button>,
  TabPanel: ({ children, ...props }) => <div {...props}>{children}</div>,
  Accordion: ({ children, ...props }) => <div {...props}>{children}</div>,
  AccordionSummary: ({ children, ...props }) => <div {...props}>{children}</div>,
  AccordionDetails: ({ children, ...props }) => <div {...props}>{children}</div>,
  Breadcrumbs: ({ children, ...props }) => <nav {...props}>{children}</nav>,
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
  Skeleton: ({ ...props }) => <div {...props}>Loading...</div>,
  Backdrop: ({ children, open, ...props }) => 
    open ? <div {...props}>{children}</div> : null,
  Modal: ({ children, open, ...props }) => 
    open ? <div {...props}>{children}</div> : null,
  Fade: ({ children, in: inProp, ...props }) => 
    inProp ? <div {...props}>{children}</div> : null,
  Grow: ({ children, in: inProp, ...props }) => 
    inProp ? <div {...props}>{children}</div> : null,
  Slide: ({ children, in: inProp, ...props }) => 
    inProp ? <div {...props}>{children}</div> : null,
  Zoom: ({ children, in: inProp, ...props }) => 
    inProp ? <div {...props}>{children}</div> : null,
  Collapse: ({ children, in: inProp, ...props }) => 
    inProp ? <div {...props}>{children}</div> : null,
  useTheme: () => ({
    palette: {
      mode: 'light',
      primary: { main: '#1976d2' },
      secondary: { main: '#dc004e' },
      error: { main: '#f44336' },
      warning: { main: '#ff9800' },
      info: { main: '#2196f3' },
      success: { main: '#4caf50' },
      background: { default: '#ffffff', paper: '#ffffff' },
      text: { primary: '#000000', secondary: '#666666' },
    },
    spacing: (factor) => `${8 * factor}px`,
    breakpoints: {
      up: () => '@media (min-width: 600px)',
      down: () => '@media (max-width: 599px)',
    },
  }),
  useMediaQuery: () => false,
  styled: (component) => component,
}));

// Mock MUI X Date Pickers
vi.mock('@mui/x-date-pickers', () => ({
  LocalizationProvider: ({ children }) => children,
  DatePicker: ({ ...props }) => <div {...props}>DatePicker</div>,
  TimePicker: ({ ...props }) => <div {...props}>TimePicker</div>,
  DateTimePicker: ({ ...props }) => <div {...props}>DateTimePicker</div>,
  AdapterDateFns: class MockAdapter {
    constructor() {}
    format() { return '2024-01-01'; }
    parse() { return new Date(); }
    isValid() { return true; }
  },
}));

// Mock axios to prevent API calls in tests
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: {
          use: vi.fn(),
        },
        response: {
          use: vi.fn(),
        },
      },
      get: vi.fn(() => Promise.resolve({ data: [] })),
      post: vi.fn(() => Promise.resolve({ data: {} })),
      put: vi.fn(() => Promise.resolve({ data: {} })),
      delete: vi.fn(() => Promise.resolve({ data: {} })),
      request: vi.fn(() => Promise.resolve({ data: {} })),
    })),
  },
}));

// Mock the API client to prevent initialization errors
vi.mock('@/services/api', () => ({
  ApiClient: class MockApiClient {
    constructor() {
      this.client = {
        interceptors: {
          request: {
            use: vi.fn(),
          },
          response: {
            use: vi.fn(),
          },
        },
        get: vi.fn(() => Promise.resolve({ data: [] })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        put: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} })),
        request: vi.fn(() => Promise.resolve({ data: {} })),
      };
    }
    
    setupInterceptors() {
      // Mock implementation
    }
  },
  apiClient: {
    client: {
      interceptors: {
        request: {
          use: vi.fn(),
        },
        response: {
          use: vi.fn(),
        },
      },
      get: vi.fn(() => Promise.resolve({ data: [] })),
      post: vi.fn(() => Promise.resolve({ data: {} })),
      put: vi.fn(() => Promise.resolve({ data: {} })),
      delete: vi.fn(() => Promise.resolve({ data: {} })),
      request: vi.fn(() => Promise.resolve({ data: {} })),
    },
  },
  api: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
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