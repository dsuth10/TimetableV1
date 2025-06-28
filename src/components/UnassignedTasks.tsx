import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { Box, Paper, Typography, List, ListItem, ListItemText } from '@mui/material';
import type { Assignment } from '../types';

interface UnassignedTasksProps {
  assignments: Assignment[];
}

const UnassignedTasks: React.FC<UnassignedTasksProps> = ({ assignments }) => {
  const unassignedTasks = assignments.filter(task => task.status === 'UNASSIGNED');

  return (
    <Box sx={{ width: 300, p: 2 }}>
      <Paper sx={{ p: 2, height: '100%' }}>
        <Typography variant="h6" gutterBottom>
          Unassigned Tasks
        </Typography>
        <Droppable droppableId="unassigned">
          {(provided, snapshot) => (
            <List
              ref={provided.innerRef}
              {...provided.droppableProps}
              data-cy="unassigned-tasks-list"
              sx={{
                minHeight: 100,
                bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'background.paper',
                borderRadius: 1,
                transition: 'background-color 0.2s ease'
              }}
            >
              {unassignedTasks.map((task, index) => (
                <Draggable
                  key={task.id}
                  draggableId={task.id.toString()}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <ListItem
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      sx={{
                        mb: 1,
                        bgcolor: snapshot.isDragging ? 'action.selected' : 'background.paper',
                        borderRadius: 1,
                        boxShadow: snapshot.isDragging ? 2 : 0,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <ListItemText
                        primary={task.task_title}
                        secondary={`${task.start_time} - ${task.end_time}`}
                      />
                    </ListItem>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </List>
          )}
        </Droppable>
      </Paper>
    </Box>
  );
};

export default UnassignedTasks;
