import { Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { store } from './store';
import Layout from './components/Layout';
import Schedule from './components/Schedule';
import AideManagement from './pages/AideManagement';
import TaskManagement from './pages/TaskManagement.tsx';
import Settings from './pages/Settings';
import ClassManagement from './pages/ClassManagement';
import TeacherRequestForm from './pages/TeacherRequestForm';

function App() {
  return (
    <Provider store={store}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Layout>
          <Routes>
            <Route path="/" element={<Schedule />} />
            <Route path="/aides" element={<AideManagement />} />
            <Route path="/tasks" element={<TaskManagement />} />
            <Route path="/classes" element={<ClassManagement />} />
            <Route path="/requests" element={<TeacherRequestForm />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </LocalizationProvider>
    </Provider>
  );
}

export default App;
