import { Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { store } from './store';
import Layout from './components/Layout';
import Schedule from './components/Schedule';
import AideManagement from './pages/AideManagement';
import TaskManagement from './pages/TaskManagement';
import Settings from './pages/Settings';
import ClassManagement from './pages/ClassManagement'; // Import the new component

function App() {
  return (
    <Provider store={store}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Layout>
          <Routes>
            <Route path="/" element={<Schedule />} />
            <Route path="/aides" element={<AideManagement />} />
            <Route path="/tasks" element={<TaskManagement />} />
            <Route path="/classes" element={<ClassManagement />} /> {/* New route for Class Management */}
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </LocalizationProvider>
    </Provider>
  );
}

export default App;
