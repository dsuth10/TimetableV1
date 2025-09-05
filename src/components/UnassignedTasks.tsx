import React, { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Box,
  Paper,
  Typography,
  List,
  TextField,
  MenuItem,
  Chip,
} from '@mui/material';
// Unified item the right panel can render: either a Task or an unassigned Assignment
export type UnassignedItem = {
  kind: 'task' | 'assignment';
  id: number;
  title: string;
  category: string;
  start_time?: string;
  end_time?: string;
  is_flexible?: boolean;
};

interface UnassignedTasksProps {
  items: UnassignedItem[];
  renderKey?: number; // Force re-render key for draggable registration
}

// Define category colors (example, align with backend if possible)
const CATEGORY_COLORS: { [key: string]: string } = {
  PLAYGROUND: '#FFD700', // Gold
  CLASS_SUPPORT: '#87CEEB', // SkyBlue
  GROUP_SUPPORT: '#90EE90', // LightGreen
  INDIVIDUAL_SUPPORT: '#FF6347', // Tomato
  // Add other categories as needed
};

const UnassignedTasks: React.FC<UnassignedTasksProps> = ({ items, renderKey = 0 }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  const allCategories = ['ALL', ...Array.from(new Set(items.map(a => a.category || 'UNKNOWN')))].filter(Boolean);

  const filteredItems = items.filter((item) => {
    const safeTitle = (item.title || '').toLowerCase();
    const matchesSearch = safeTitle.includes((searchTerm || '').toLowerCase());
    const itemCat = item.category || 'UNKNOWN';
    const matchesCategory = filterCategory === 'ALL' || itemCat === filterCategory;
    return matchesSearch && matchesCategory;
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

        <Droppable droppableId="unassigned" key={`unassigned-${renderKey}`}>
          {(provided, snapshot) => (
            <List
              ref={provided.innerRef}
              {...provided.droppableProps}
              data-cy="unassigned-tasks-list"
              data-testid="unassigned-tasks-droppable"
              sx={{
                flexGrow: 1,
                overflowY: 'auto',
                minHeight: 100,
                bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'background.paper',
                borderRadius: 1,
                transition: 'background-color 0.2s ease',
                p: 1, // Added padding to the list itself
                border: snapshot.isDraggingOver ? '2px dashed #2196f3' : '1px solid transparent',
              }}
            >
              {filteredItems.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                  No unassigned tasks found.
                </Typography>
              )}
              {filteredItems.map((item, index) => (
                <Draggable
                  key={`draggable-${item.kind}-${item.id}-${renderKey}`}
                  draggableId={`${item.kind}-${item.id}`}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      data-testid={`unassigned-${item.kind}-${item.id}`}
                      sx={{
                        mb: 1,
                        bgcolor: snapshot.isDragging ? 'action.selected' : 'background.paper',
                        border: `1px solid ${CATEGORY_COLORS[item.category || 'UNKNOWN'] || '#ccc'}`,
                        borderRadius: 1,
                        boxShadow: snapshot.isDragging ? 3 : 1,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          boxShadow: 3,
                        },
                        p: 2,
                        cursor: 'grab',
                        '&:active': {
                          cursor: 'grabbing',
                        },
                        transform: snapshot.isDragging ? provided.draggableProps.style?.transform : 'none',
                      }}
                    >
                      <Box>
                        <Typography variant="body1" component="div" sx={{ fontWeight: 'medium' }}>
                          {item.title}
                        </Typography>
                        <Typography variant="body2" color="text.primary" sx={{ mb: 1 }}>
                          {item.start_time && item.end_time ? `${item.start_time} - ${item.end_time}` : 'No time set'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            label={item.category || 'UNKNOWN'}
                            size="small"
                            sx={{
                              bgcolor: CATEGORY_COLORS[item.category || 'UNKNOWN'] || '#ccc',
                              color: 'white',
                              fontSize: '0.75rem',
                            }}
                          />
                          {item.is_flexible && (
                            <Chip
                              label="Flexible"
                              size="small"
                              color="secondary"
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
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
