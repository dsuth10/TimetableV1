import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, 
  Typography, 
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import { DragIndicator as DragIcon } from '@mui/icons-material';
import { useDrag } from 'react-dnd';
import { fetchTasks } from '../store/slices/tasksSlice';

const UnassignedTaskList = () => {
  const dispatch = useDispatch();
  const { items: tasks, status } = useSelector((state) => state.tasks);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchTasks());
    }
  }, [status, dispatch]);

  const unassignedTasks = tasks.filter(task => task.status === 'UNASSIGNED');

  const getCategoryColor = (category) => {
    const colors = {
      'PLAYGROUND': '#4caf50',
      'CLASS_SUPPORT': '#2196f3',
      'GROUP_SUPPORT': '#ff9800',
      'INDIVIDUAL_SUPPORT': '#9c27b0'
    };
    return colors[category] || '#757575';
  };

  const DraggableTask = ({ task }) => {
    const [{ isDragging }, drag] = useDrag({
      type: 'TASK',
      item: { id: task.id, type: 'TASK' },
      collect: (monitor) => ({
        isDragging: monitor.isDragging()
      })
    });

    return (
      <ListItem
        ref={drag}
        sx={{
          opacity: isDragging ? 0.5 : 1,
          cursor: 'move',
          '&:hover': {
            backgroundColor: 'action.hover'
          }
        }}
      >
        <DragIcon sx={{ mr: 1, color: 'text.secondary' }} />
        <ListItemText
          primary={task.title}
          secondary={
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" component="span">
                {task.start_time} - {task.end_time}
              </Typography>
              {task.classroom && (
                <Typography variant="body2" component="span" color="text.secondary">
                  • {task.classroom.name}
                </Typography>
              )}
            </Box>
          }
        />
        <Chip
          label={task.category.replace('_', ' ')}
          size="small"
          sx={{ 
            backgroundColor: getCategoryColor(task.category),
            color: 'white',
            mr: 1
          }}
        />
      </ListItem>
    );
  };

  if (status === 'loading') {
    return (
      <Box p={2}>
        <Typography>Loading tasks...</Typography>
      </Box>
    );
  }

  if (unassignedTasks.length === 0) {
    return (
      <Box p={2}>
        <Typography color="text.secondary">No unassigned tasks</Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Unassigned Tasks ({unassignedTasks.length})
      </Typography>
      <List>
        {unassignedTasks.map((task, index) => (
          <React.Fragment key={task.id}>
            <DraggableTask task={task} />
            {index < unassignedTasks.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default UnassignedTaskList; 