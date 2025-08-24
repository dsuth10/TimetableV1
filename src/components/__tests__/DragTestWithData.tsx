import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { useAssignments } from '../../hooks/useAssignments';
import { useTeacherAides } from '../../hooks/useTeacherAides';

const DragTestWithData: React.FC = () => {
  const { assignments, isLoading: assignmentsLoading, updateAssignment } = useAssignments();
  const { teacherAides, isLoading: aidesLoading } = useTeacherAides();

  const handleDragEnd = async (result: any) => {
    console.log('Drag result:', result);
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // Find the assignment being dragged
    const assignment = assignments.find(a => a.id.toString() === draggableId);
    if (!assignment) {
      console.error('Assignment not found:', draggableId);
      return;
    }

    console.log('Dragging assignment:', assignment);
    console.log('From:', source.droppableId);
    console.log('To:', destination.droppableId);

    // Simple test: just log the drag operation
    if (source.droppableId !== destination.droppableId) {
      console.log('Would move assignment from', source.droppableId, 'to', destination.droppableId);
    }
  };

  if (assignmentsLoading || aidesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const unassignedTasks = assignments.filter(a => a.status === 'UNASSIGNED');
  const assignedTasks = assignments.filter(a => a.status === 'ASSIGNED');

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Drag Test with Real Data
      </Typography>
      
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Total assignments: {assignments.length} | 
        Unassigned: {unassignedTasks.length} | 
        Assigned: {assignedTasks.length}
      </Typography>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Unassigned Tasks */}
          <Paper sx={{ p: 2, minWidth: 300 }}>
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
                    bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'background.paper',
                    border: snapshot.isDraggingOver ? '2px dashed #2196f3' : '1px solid #ddd',
                    borderRadius: 1,
                    p: 1,
                  }}
                >
                  {unassignedTasks.map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
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
                          <Typography variant="body2" fontWeight="medium">
                            {task.task_title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {task.task_category}
                          </Typography>
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </Paper>

          {/* Assigned Tasks */}
          <Paper sx={{ p: 2, minWidth: 300 }}>
            <Typography variant="h6" gutterBottom>
              Assigned Tasks
            </Typography>
            <Droppable droppableId="assigned">
              {(provided, snapshot) => (
                <Box
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{
                    minHeight: 200,
                    bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'background.paper',
                    border: snapshot.isDraggingOver ? '2px dashed #2196f3' : '1px solid #ddd',
                    borderRadius: 1,
                    p: 1,
                  }}
                >
                  {assignedTasks.map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
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
                          <Typography variant="body2" fontWeight="medium">
                            {task.task_title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {task.task_category} - {task.aide_name || 'No aide'}
                          </Typography>
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </Paper>
        </Box>
      </DragDropContext>
    </Box>
  );
};

export default DragTestWithData;

