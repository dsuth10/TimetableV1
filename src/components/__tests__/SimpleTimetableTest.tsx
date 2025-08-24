import React from 'react';
// @ts-ignore
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Box, Paper, Typography, Grid } from '@mui/material';

const SimpleTimetableTest: React.FC = () => {
  const [items] = React.useState([
    { id: '1', content: 'Task 1' },
    { id: '2', content: 'Task 2' },
  ]);

  const handleDragEnd = (result: any) => {
    console.log('🎯 SIMPLE TIMETABLE TEST - Drag result:', result);
    
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

  const timeSlots = ['09:00', '09:30', '10:00', '10:30'];
  const days = ['Monday', 'Tuesday', 'Wednesday'];

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Simple Timetable Test
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        Try dragging items from the left to the timetable grid on the right.
      </Typography>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Draggable Items */}
          <Box sx={{ width: '25%' }}>
            <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>
                Unassigned Tasks
              </Typography>
              <Droppable droppableId="unassigned">
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
          </Box>

          {/* Timetable Grid */}
          <Box sx={{ width: '75%' }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Timetable Grid (Try dragging items here)
              </Typography>
              
                             {/* Header */}
               <Box sx={{ display: 'flex', mb: 1 }}>
                 <Box sx={{ width: '20%', p: 1, textAlign: 'center', fontWeight: 'bold' }}>Time</Box>
                 {days.map((day) => (
                   <Box key={day} sx={{ width: '26.67%', p: 1, textAlign: 'center', fontWeight: 'bold' }}>{day}</Box>
                 ))}
               </Box>

               {/* Time slots */}
               {timeSlots.map((time) => (
                 <Box key={time} sx={{ display: 'flex', mb: 1 }}>
                   <Box sx={{ width: '20%', p: 1, textAlign: 'right', fontSize: '0.9em' }}>{time}</Box>
                   {days.map((day) => {
                     const droppableId = `${day}-${time}`;
                     return (
                       <Box key={droppableId} sx={{ width: '26.67%' }}>
                         <Droppable droppableId={droppableId}>
                           {(provided, snapshot) => (
                             <Box
                               ref={provided.innerRef}
                               {...provided.droppableProps}
                               sx={{
                                 height: 60,
                                 p: 1,
                                 m: 0.5,
                                 bgcolor: snapshot.isDraggingOver ? '#e3f2fd' : '#f8f8f8',
                                 border: snapshot.isDraggingOver ? '3px dashed #2196f3' : '2px solid #ddd',
                                 borderRadius: 1,
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 cursor: 'pointer',
                                 transition: 'all 0.2s ease',
                                 '&:hover': {
                                   bgcolor: '#f0f8ff',
                                   border: '2px dashed #2196f3',
                                 },
                               }}
                             >
                               <Typography variant="body2" color="textSecondary">
                                 {snapshot.isDraggingOver ? 'Drop here!' : 'Empty'}
                               </Typography>
                               {provided.placeholder}
                             </Box>
                           )}
                         </Droppable>
                       </Box>
                     );
                   })}
                 </Box>
               ))}
             </Paper>
           </Box>
                 </Box>
       </DragDropContext>
    </Box>
  );
};

export default SimpleTimetableTest;
