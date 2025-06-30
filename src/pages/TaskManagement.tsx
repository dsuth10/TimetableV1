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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { fetchTasks } from '../store/slices/tasksSlice';
import TaskCreationModal from '../components/TaskModals/TaskCreationModal';
import TaskEditModal from '../components/TaskModals/TaskEditModal';
import { deleteTask } from '../services/taskService';
import { RootState, AppDispatch } from '../store';
import { Task } from '../types/task';

function TaskManagement() {
  const dispatch: AppDispatch = useDispatch();
  const { items: tasks, status, error } = useSelector((state: RootState) => state.tasks);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchTasks());
    }
  }, [status, dispatch]);

  const handleEditClick = (task: Task) => {
    setTaskToEdit(task);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (taskToDelete) {
      try {
        await deleteTask(taskToDelete.id);
        dispatch(fetchTasks());
        setIsConfirmDeleteOpen(false);
        setTaskToDelete(null);
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

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
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'PLAYGROUND': '#4caf50',
      'CLASS_SUPPORT': '#2196f3',
      'GROUP_SUPPORT': '#ff9800',
      'INDIVIDUAL_SUPPORT': '#9c27b0'
    };
    return colors[category] || '#757575';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'UNASSIGNED': '#f44336',
      'ASSIGNED': '#4caf50',
      'COMPLETED': '#2196f3'
    };
    return colors[status] || '#757575';
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
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
          {tasks.map((task: Task) => (
            <Grid item xs={12} sm={6} md={4} key={task.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="div">
                      {task.title}
                    </Typography>
                    <Box>
                      <Tooltip title="Edit">
                        <IconButton size="small" sx={{ mr: 1 }} onClick={() => handleEditClick(task)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDeleteClick(task)}>
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

                  {task.school_class && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      School Class: {task.school_class.class_code} ({task.school_class.teacher})
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
                  {task.expires_on && (
                    <Typography variant="body2" color="text.secondary">
                      Expires On: {new Date(task.expires_on).toLocaleDateString()}
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
        onSubmit={() => {
          setIsCreateModalOpen(false);
          dispatch(fetchTasks());
        }}
      />

      {taskToEdit && (
        <TaskEditModal
          open={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={() => {
            setIsEditModalOpen(false);
            setTaskToEdit(null);
            dispatch(fetchTasks());
          }}
          task={taskToEdit}
        />
      )}

      <Dialog open={isConfirmDeleteOpen} onClose={() => setIsConfirmDeleteOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the task "{taskToDelete?.title}"?
            {taskToDelete?.recurrence_rule && (
              <> This is a recurring task, and deleting it will remove all future occurrences.
              </>
            )}
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsConfirmDeleteOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}

export default TaskManagement;
