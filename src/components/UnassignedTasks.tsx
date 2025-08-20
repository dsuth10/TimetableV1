import React, { useState } from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import {
  Box,
  Paper,
  Typography,
  List,

  ListItemText,
  TextField,
  MenuItem,
  Chip,
  Tooltip,
} from '@mui/material';
import type { Assignment } from '../types'; // Assuming Assignment type includes task details

interface UnassignedTasksProps {
  assignments: Assignment[];
}

// Define category colors (example, align with backend if possible)
const CATEGORY_COLORS: { [key: string]: string } = {
  PLAYGROUND: '#FFD700', // Gold
  CLASS_SUPPORT: '#87CEEB', // SkyBlue
  GROUP_SUPPORT: '#90EE90', // LightGreen
  INDIVIDUAL_SUPPORT: '#FF6347', // Tomato
  // Add other categories as needed
};

const UnassignedTasks: React.FC<UnassignedTasksProps> = ({ assignments }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  const allCategories = ['ALL', ...Array.from(new Set(assignments.map(a => a.task_category)))];

  const filteredTasks = assignments.filter((task) => {
    const matchesStatus = task.status === 'UNASSIGNED';
    const matchesSearch = task.task_title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === 'ALL' || task.task_category === filterCategory;
    return matchesStatus && matchesSearch && matchesCategory;
  });

  return (
    <Box sx={{ width: 300, p: 2 }}>
      <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>
          Unassigned Tasks
        </Typography>

        <TextField
          label="Search Tasks"
          variant="outlined"
          size="small"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          select
          label="Filter by Category"
          variant="outlined"
          size="small"
          fullWidth
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          sx={{ mb: 2 }}
        >
          {allCategories.map((category) => (
            <MenuItem key={category} value={category}>
              {category}
            </MenuItem>
          ))}
        </TextField>

        <Droppable droppableId="unassigned">
          {(provided, snapshot) => (
            <List
              ref={provided.innerRef}
              {...provided.droppableProps}
              data-cy="unassigned-tasks-list"
              sx={{
                flexGrow: 1,
                overflowY: 'auto',
                minHeight: 100,
                bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'background.paper',
                borderRadius: 1,
                transition: 'background-color 0.2s ease',
                p: 1, // Added padding to the list itself
              }}
            >
              {filteredTasks.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                  No unassigned tasks found.
                </Typography>
              )}
              {filteredTasks.map((task, index) => (
                <Draggable
                  key={task.id}
                  draggableId={task.id.toString()}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <Tooltip
                      title={
                        <React.Fragment>
                          <Typography color="inherit">{task.task_title}</Typography>
                          <em>{`${task.start_time} - ${task.end_time}`}</em> <br />
                          {task.notes && <Typography variant="caption">{task.notes}</Typography>}
                        </React.Fragment>
                      }
                      placement="right"
                      arrow
                    >
                      <Box
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        sx={{
                          mb: 1,
                          bgcolor: snapshot.isDragging ? 'action.selected' : 'background.paper',
                          border: `1px solid ${CATEGORY_COLORS[task.task_category] || '#ccc'}`,
                          borderRadius: 1,
                          boxShadow: snapshot.isDragging ? 3 : 1,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            boxShadow: 3,
                          },
                          p: 2,
                        }}
                      >
                        <ListItemText
                          primary={task.task_title}
                          secondary={
                            <React.Fragment>
                              <Typography
                                sx={{ display: 'inline' }}
                                component="span"
                                variant="body2"
                                color="text.primary"
                              >
                                {`${task.start_time} - ${task.end_time}`}
                              </Typography>
                              <br />
                              <Chip
                                label={task.task_category}
                                size="small"
                                sx={{
                                  bgcolor: CATEGORY_COLORS[task.task_category] || '#ccc',
                                  color: 'white',
                                  mt: 0.5,
                                }}
                              />
                            </React.Fragment>
                          }
                        />
                                              </Box>
                    </Tooltip>
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
