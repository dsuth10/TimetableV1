import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Box, Paper, Typography } from '@mui/material';

const SimpleDragTest: React.FC = () => {
  const [items, setItems] = React.useState([
    { id: '1', content: 'Task 1' },
    { id: '2', content: 'Task 2' },
    { id: '3', content: 'Task 3' },
  ]);

  const handleDragEnd = (result: any) => {
    console.log('Drag result:', result);
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    setItems(newItems);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Simple Drag Test
      </Typography>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="test-droppable">
          {(provided, snapshot) => (
            <Paper
              ref={provided.innerRef}
              {...provided.droppableProps}
              sx={{
                p: 2,
                minHeight: 200,
                bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'background.paper',
                border: snapshot.isDraggingOver ? '2px dashed #2196f3' : '1px solid #ddd',
              }}
            >
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      sx={{
                        p: 2,
                        mb: 1,
                        bgcolor: snapshot.isDragging ? 'action.selected' : 'background.paper',
                        border: '1px solid #ddd',
                        borderRadius: 1,
                        cursor: 'grab',
                        '&:active': { cursor: 'grabbing' },
                        transform: snapshot.isDragging ? provided.draggableProps.style?.transform : 'none',
                      }}
                    >
                      {item.content}
                    </Box>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </Paper>
          )}
        </Droppable>
      </DragDropContext>
    </Box>
  );
};

export default SimpleDragTest;

