import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CircularProgress, Box } from '@mui/material';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './pages/NotFound';
import ToastContainer from './components/ToastContainer';
import { initializeStores } from './store';

// Lazy load pages for better performance
import Schedule from './components/Schedule';
import SimpleDragTest from './components/__tests__/SimpleDragTest';
import DragTestWithData from './components/__tests__/DragTestWithData';
import QuickDragTest from './components/__tests__/QuickDragTest';
import DroppableTest from './components/__tests__/DroppableTest';
import SimpleTimetableTest from './components/__tests__/SimpleTimetableTest';
import BasicDragTest from './components/__tests__/BasicDragTest';
import MinimalDragTest from './components/__tests__/MinimalDragTest';
const AideManagement = lazy(() => import('./pages/AideManagement'));
const TaskManagement = lazy(() => import('./pages/TaskManagement'));
const Settings = lazy(() => import('./pages/Settings'));
const ClassManagement = lazy(() => import('./pages/ClassManagement'));
const TeacherRequestForm = lazy(() => import('./pages/TeacherRequestForm'));

// Loading component
const PageLoader = () => (
  <Box 
    display="flex" 
    justifyContent="center" 
    alignItems="center" 
    minHeight="400px"
  >
    <CircularProgress />
  </Box>
);

function App() {
  useEffect(() => {
    // Initialize stores on app startup
    initializeStores().catch(console.error);
  }, []);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <ErrorBoundary>
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Schedule />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/test" element={<SimpleDragTest />} />
              <Route path="/test-data" element={<DragTestWithData />} />
              <Route path="/quick-test" element={<QuickDragTest />} />
              <Route path="/droppable-test" element={<DroppableTest />} />
              <Route path="/simple-timetable" element={<SimpleTimetableTest />} />
              <Route path="/basic-test" element={<BasicDragTest />} />
              <Route path="/minimal-test" element={<MinimalDragTest />} />
              <Route path="/aides" element={<AideManagement />} />
              <Route path="/tasks" element={<TaskManagement />} />
              <Route path="/classes" element={<ClassManagement />} />
              <Route path="/requests" element={<TeacherRequestForm />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Layout>
        <ToastContainer />
      </ErrorBoundary>
    </LocalizationProvider>
  );
}

export default App;
