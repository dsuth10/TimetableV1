import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Box, Paper, Typography } from '@mui/material';

const BasicDragTest: React.FC = () => {
  const [items] = React.useState([
    { id: '1', content: 'Task 1' },
    { id: '2', content: 'Task 2' },
  ]);

  const handleDragEnd = (result: any) => {
    console.log('🎯 BASIC DRAG TEST - Drag result:', result);
    
    if (!result.destination) {
      console.log('❌ No destination - drag cancelled');
      alert('No destination detected! The drop zones are not working.');
      return;
    }

    console.log('✅ Drop successful!');
    console.log('Source:', result.source);
    console.log('Destination:', result.destination);
    alert(`Drop successful!\nFrom: ${result.source.droppableId}\nTo: ${result.destination.droppableId}`);
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Basic Drag Test
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Try dragging the items below to the drop zone on the right.
      </Typography>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Box sx={{ display: 'flex', gap: 4 }}>
          {/* Draggable Items */}
          <Box sx={{ width: '200px' }}>
            <Typography variant="h6" gutterBottom>
              Draggable Items
            </Typography>
            <Droppable droppableId="source">
              {(provided, snapshot) => (
                <Paper
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{
                    minHeight: 200,
                    p: 2,
                    bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'background.paper',
                    border: '2px dashed #ccc',
                  }}
                >
                  {items.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <Paper
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          sx={{
                            p: 2,
                            mb: 1,
                            bgcolor: snapshot.isDragging ? 'action.selected' : 'background.paper',
                            border: '1px solid #ddd',
                            cursor: 'grab',
                            '&:active': { cursor: 'grabbing' },
                            transform: snapshot.isDragging ? provided.draggableProps.style?.transform : 'none',
                            boxShadow: snapshot.isDragging ? 3 : 1,
                          }}
                        >
                          <Typography>{item.content}</Typography>
                        </Paper>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Paper>
              )}
            </Droppable>
          </Box>

          {/* Drop Zone */}
          <Box sx={{ width: '200px' }}>
            <Typography variant="h6" gutterBottom>
              Drop Zone
            </Typography>
            <Droppable droppableId="destination">
              {(provided, snapshot) => (
                <Paper
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{
                    minHeight: 200,
                    p: 2,
                    bgcolor: snapshot.isDraggingOver ? '#e3f2fd' : '#f8f8f8',
                    border: snapshot.isDraggingOver ? '3px dashed #2196f3' : '2px solid #ddd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="body2" color="textSecondary">
                    {snapshot.isDraggingOver ? 'Drop here!' : 'Drop Zone'}
                  </Typography>
                  {provided.placeholder}
                </Paper>
              )}
            </Droppable>
          </Box>
        </Box>
      </DragDropContext>
    </Box>
  );
};

export default BasicDragTest;
