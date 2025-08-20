import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Breadcrumbs,
  LinearProgress,
  useTheme,

} from '@mui/material';
import {
  Menu as MenuIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Class as ClassIcon,
  Settings as SettingsIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useUIStore } from '@/store';

interface LayoutProps {
  children: React.ReactNode;
}

const drawerWidth = 240;

const navigationItems = [
  { path: '/', label: 'Schedule', icon: <ScheduleIcon /> },
  { path: '/aides', label: 'Aides', icon: <PeopleIcon /> },
  { path: '/tasks', label: 'Tasks', icon: <AssignmentIcon /> },
  { path: '/classes', label: 'Classes', icon: <ClassIcon /> },
  { path: '/settings', label: 'Settings', icon: <SettingsIcon /> },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const theme = useTheme();
  // const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { isSidebarOpen, setSidebarOpen, globalLoading } = useUIStore();

  const handleDrawerToggle = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Home', path: '/' }];
    
    pathSegments.forEach((segment, index) => {
      const path = '/' + pathSegments.slice(0, index + 1).join('/');
      const label = segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({ label, path });
    });
    
    return breadcrumbs;
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Timetable App
        </Typography>
      </Toolbar>
      <List>
        {navigationItems.map((item) => (
          <ListItem
            key={item.path}
            component={Link}
            to={item.path}

            sx={{
              color: 'inherit',
              textDecoration: 'none',
              '&.Mui-selected': {
                backgroundColor: theme.palette.action.selected,
              },
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          zIndex: theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {navigationItems.find(item => item.path === location.pathname)?.label || 'Timetable App'}
          </Typography>
        </Toolbar>
        {globalLoading && (
          <LinearProgress 
            sx={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0 
            }} 
          />
        )}
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="navigation"
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={isSidebarOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar /> {/* Spacer for fixed app bar */}
        
        {/* Breadcrumbs */}
        <Box sx={{ px: 3, py: 1, backgroundColor: theme.palette.background.default }}>
          <Breadcrumbs aria-label="breadcrumb">
            {getBreadcrumbs().map((breadcrumb, index) => (
              <Link
                key={breadcrumb.path}
                to={breadcrumb.path}
                style={{
                  color: index === getBreadcrumbs().length - 1 
                    ? theme.palette.text.primary 
                    : theme.palette.text.secondary,
                  textDecoration: 'none',
                }}
                aria-current={index === getBreadcrumbs().length - 1 ? 'page' : undefined}
              >
                {index === 0 ? <HomeIcon sx={{ fontSize: 16, mr: 0.5 }} /> : null}
                {breadcrumb.label}
              </Link>
            ))}
          </Breadcrumbs>
        </Box>

        {/* Page content */}
        <Container component="div" sx={{ flexGrow: 1, py: 3 }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;
