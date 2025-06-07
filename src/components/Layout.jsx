import { Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Container, Box } from '@mui/material';

function Layout({ children }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Timetable App
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
              Schedule
            </Link>
            <Link to="/aides" style={{ color: 'white', textDecoration: 'none' }}>
              Aides
            </Link>
            <Link to="/tasks" style={{ color: 'white', textDecoration: 'none' }}>
              Tasks
            </Link>
            <Link to="/settings" style={{ color: 'white', textDecoration: 'none' }}>
              Settings
            </Link>
          </Box>
        </Toolbar>
      </AppBar>
      <Container component="main" sx={{ flexGrow: 1, py: 3 }}>
        {children}
      </Container>
    </Box>
  );
}

export default Layout; 