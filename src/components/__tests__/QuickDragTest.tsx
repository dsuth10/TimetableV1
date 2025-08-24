import React from 'react';
// @ts-ignore
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Box, Paper, Typography } from '@mui/material';

const QuickDragTest: React.FC = () => {
  const [items] = React.useState([
    { id: '1', content: 'Test Task 1' },
    { id: '2', content: 'Test Task 2' },
  ]);

  const handleDragEnd = (result: any) => {
    console.log('🎯 DRAG EVENT DETECTED!', result);
    alert('Drag event detected! Check console for details.');
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Quick Drag Test
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Try dragging the items below. You should see an alert and console log.
      </Typography>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="test-droppable">
          {(provided, snapshot) => (
            <Paper
              ref={provided.innerRef}
              {...provided.droppableProps}
              sx={{
                p: 3,
                minHeight: 200,
                bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'background.paper',
                border: snapshot.isDraggingOver ? '3px dashed #2196f3' : '2px solid #ddd',
                borderRadius: 2,
              }}
            >
              <Typography variant="h6" gutterBottom>
                Drop Zone {snapshot.isDraggingOver ? '(Drag Over)' : ''}
              </Typography>
              
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      sx={{
                        p: 2,
                        mb: 2,
                        bgcolor: snapshot.isDragging ? 'action.selected' : 'background.paper',
                        border: '1px solid #ddd',
                        borderRadius: 1,
                        cursor: 'grab',
                        '&:active': { cursor: 'grabbing' },
                        transform: snapshot.isDragging ? provided.draggableProps.style?.transform : 'none',
                        boxShadow: snapshot.isDragging ? 3 : 1,
                      }}
                    >
                      <Typography variant="body1">
                        {item.content} {snapshot.isDragging ? '(Dragging)' : ''}
                      </Typography>
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

export default QuickDragTest;

