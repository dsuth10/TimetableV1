import React from 'react';
// @ts-ignore
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Box, Paper, Typography, Grid } from '@mui/material';

const DroppableTest: React.FC = () => {
  const [items] = React.useState([
    { id: '1', content: 'Test Task 1' },
    { id: '2', content: 'Test Task 2' },
  ]);

  const handleDragEnd = (result: any) => {
    console.log('🎯 DROPPABLE TEST - Drag result:', result);
    
    if (!result.destination) {
      console.log('❌ No destination - drag cancelled');
      alert('No destination detected! This means the drop zones aren\'t working.');
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
        Droppable Area Test
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Try dragging items to the drop zones below. You should see visual feedback when dragging over them.
      </Typography>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container spacing={3}>
          {/* Draggable Items */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>
                Draggable Items
              </Typography>
              <Droppable droppableId="source">
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      minHeight: 200,
                      p: 2,
                      bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'background.paper',
                      border: '2px dashed #ccc',
                      borderRadius: 1,
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
                  </Box>
                )}
              </Droppable>
            </Paper>
          </Grid>

          {/* Drop Zones */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Drop Zones (Try dragging items here)
              </Typography>
              <Grid container spacing={2}>
                {['drop-zone-1', 'drop-zone-2', 'drop-zone-3'].map((zoneId) => (
                  <Grid item xs={12} md={4} key={zoneId}>
                    <Droppable droppableId={zoneId}>
                      {(provided, snapshot) => (
                        <Paper
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          sx={{
                            minHeight: 150,
                            p: 2,
                            bgcolor: snapshot.isDraggingOver ? '#e3f2fd' : '#f8f8f8',
                            border: snapshot.isDraggingOver ? '3px dashed #2196f3' : '2px solid #ddd',
                            borderRadius: 2,
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography variant="body2" color="textSecondary">
                            {snapshot.isDraggingOver ? 'Drop here!' : `Drop Zone: ${zoneId}`}
                          </Typography>
                          {provided.placeholder}
                        </Paper>
                      )}
                    </Droppable>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </DragDropContext>
    </Box>
  );
};

export default DroppableTest;

