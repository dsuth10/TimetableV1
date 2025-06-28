import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { Box, Paper, Typography, List, ListItem, ListItemText, Chip } from '@mui/material';
import { Assignment } from '../types/assignment';

interface UnassignedTasksProps {
  assignments: Assignment[];
}

const UnassignedTasks: React.FC<UnassignedTasksProps> = ({ assignments }) => {
  const unassignedTasks = assignments.filter(a => a.status === 'UNASSIGNED');
  
  console.log('Unassigned tasks:', unassignedTasks);

  return (
    <Box width={300} p={2}>
      <Typography variant="h6" gutterBottom>
        Unassigned Tasks
      </Typography>
      
      <Droppable droppableId="unassigned">
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            minHeight={400}
            border="1px solid #e0e0e0"
            borderRadius={1}
            p={1}
            sx={{
              backgroundColor: snapshot.isDraggingOver ? 'action.hover' : 'background.paper',
              transition: 'background-color 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <List>
              {unassignedTasks.map((assignment, index) => (
                <Draggable
                  key={assignment.id}
                  draggableId={assignment.id.toString()}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <ListItem
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      sx={{
                        mb: 1,
                        backgroundColor: snapshot.isDragging ? 'action.selected' : 'background.paper',
                        borderRadius: 1,
                        transform: snapshot.isDragging ? 'scale(1.02)' : 'scale(1)',
                        transition: 'all 0.2s ease-in-out',
                        cursor: 'grab',
                        '&:active': {
                          cursor: 'grabbing',
                        },
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                        boxShadow: snapshot.isDragging ? 3 : 1,
                      }}
                    >
                      <ListItemText
                        primary={assignment.task_title}
                        secondary={
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" component="span">
                              {assignment.start_time} - {assignment.end_time}
                            </Typography>
                            {assignment.classroom_name && (
                              <Typography variant="body2" component="span" color="text.secondary">
                                • {assignment.classroom_name}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <Chip
                        label={assignment.task_category.replace('_', ' ')}
                        size="small"
                        sx={{ 
                          backgroundColor: 'primary.main',
                          color: 'primary.contrastText',
                        }}
                      />
                    </ListItem>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </List>
          </Box>
        )}
      </Droppable>
    </Box>
  );
};

export default UnassignedTasks; 