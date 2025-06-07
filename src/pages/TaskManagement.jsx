import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { fetchTasks } from '../store/slices/tasksSlice';
import TaskCreationModal from '../components/TaskModals/TaskCreationModal.jsx';

function TaskManagement() {
  const dispatch = useDispatch();
  const { items: tasks, status, error } = useSelector((state) => state.tasks);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchTasks());
    }
  }, [status, dispatch]);

  if (status === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'failed') {
    return (
      <Box>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  const getCategoryColor = (category) => {
    const colors = {
      'PLAYGROUND': '#4caf50',
      'CLASS_SUPPORT': '#2196f3',
      'GROUP_SUPPORT': '#ff9800',
      'INDIVIDUAL_SUPPORT': '#9c27b0'
    };
    return colors[category] || '#757575';
  };

  const getStatusColor = (status) => {
    const colors = {
      'UNASSIGNED': '#f44336',
      'ASSIGNED': '#4caf50',
      'COMPLETED': '#2196f3'
    };
    return colors[status] || '#757575';
  };

  return (
    <>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Tasks ({tasks.length})</Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Task
          </Button>
        </Box>

        <Grid container spacing={3}>
          {tasks.map(task => (
            <Grid item xs={12} sm={6} md={4} key={task.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="div">
                      {task.title}
                    </Typography>
                    <Box>
                      <Tooltip title="Edit">
                        <IconButton size="small" sx={{ mr: 1 }}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip 
                      label={task.category.replace('_', ' ')} 
                      size="small"
                      sx={{ 
                        backgroundColor: getCategoryColor(task.category),
                        color: 'white'
                      }}
                    />
                    <Chip 
                      label={task.status} 
                      size="small"
                      sx={{ 
                        backgroundColor: getStatusColor(task.status),
                        color: 'white'
                      }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Time: {task.start_time} - {task.end_time}
                  </Typography>

                  {task.classroom && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Classroom: {task.classroom.name}
                    </Typography>
                  )}

                  {task.notes && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Notes: {task.notes}
                    </Typography>
                  )}

                  {task.recurrence_rule && (
                    <Typography variant="body2" color="text.secondary">
                      Recurring: {task.recurrence_rule}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <TaskCreationModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          dispatch(fetchTasks());
        }}
      />
    </>
  );
}

export default TaskManagement; 