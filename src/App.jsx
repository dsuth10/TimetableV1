import { Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import Layout from './components/Layout';
import Schedule from './pages/Schedule';
import AideManagement from './pages/AideManagement';
import TaskManagement from './pages/TaskManagement';
import Settings from './pages/Settings';

function App() {
  return (
    <Provider store={store}>
      <Layout>
        <Routes>
          <Route path="/" element={<Schedule />} />
          <Route path="/aides" element={<AideManagement />} />
          <Route path="/tasks" element={<TaskManagement />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Provider>
  );
}

export default App; 