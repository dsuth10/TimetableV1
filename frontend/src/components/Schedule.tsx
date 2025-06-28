import React from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { Box, Container, Paper, Snackbar, Alert } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAssignments, updateAssignment } from '../api/assignments';
import { Assignment } from '../types/assignment';
import TimetableView from './TimetableView';
import UnassignedTasks from './UnassignedTasks';
import { format, parseISO } from 'date-fns';

const Schedule: React.FC = () => {
  const queryClient = useQueryClient();
  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const { data: assignmentsData, isLoading } = useQuery<Assignment[]>({
    queryKey: ['assignments'],
    queryFn: getAssignments,
  });

  React.useEffect(() => {
    if (assignmentsData) {
      setAssignments(assignmentsData);
    }
  }, [assignmentsData]);

  const updateAssignmentMutation = useMutation({
    mutationFn: updateAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: (error) => {
      setError('Failed to update assignment. Please try again.');
    }
  });

  const onDragEnd = (result: DropResult) => {
    console.log('Drag end result:', result);
    
    if (!result.destination) {
      console.log('No destination, dropping cancelled');
      return;
    }

    const { source, destination, draggableId } = result;
    const assignmentId = parseInt(draggableId);
    const assignment = assignments.find(a => a.id === assignmentId);
    
    if (!assignment) {
      console.log('Assignment not found:', assignmentId);
      return;
    }

    console.log('Moving assignment:', assignment);
    console.log('From:', source.droppableId);
    console.log('To:', destination.droppableId);

    // If dropping back to unassigned, mark as unassigned
    if (destination.droppableId === 'unassigned') {
      const updatedAssignment: Assignment = {
        ...assignment,
        status: 'UNASSIGNED',
        aide_id: null,
        aide_name: null,
      };
      console.log('Updating to unassigned:', updatedAssignment);
      updateAssignmentMutation.mutate(updatedAssignment);
      return;
    }

    // Parse the destination slot
    const [day, time] = destination.droppableId.split('-');
    console.log('Parsed day:', day, 'time:', time);
    
    // Convert day to actual date (using current week)
    const today = new Date();
    const dayIndex = ['MO', 'TU', 'WE', 'TH', 'FR'].indexOf(day);
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + (dayIndex - today.getDay() + 7) % 7);
    
    // Format date and time for backend
    const formattedDate = format(targetDate, 'yyyy-MM-dd');
    const formattedTime = time + ':00'; // Add seconds for backend format

    console.log('Formatted date:', formattedDate);
    console.log('Formatted time:', formattedTime);

    // Check if the time slot matches for time-constrained tasks
    if (!assignment.is_flexible && assignment.start_time !== time) {
      console.log('Time slot mismatch for non-flexible task');
      setError('This task can only be assigned to its specified time slot.');
      return;
    }

    // Check if the destination slot already has an assignment
    const existingAssignment = assignments.find(
      a => a.date === formattedDate && a.start_time === formattedTime && a.id !== assignmentId
    );
    if (existingAssignment) {
      console.log('Slot already occupied:', existingAssignment);
      setError('This time slot is already occupied.');
      return;
    }

    const updatedAssignment: Assignment = {
      ...assignment,
      date: formattedDate,
      start_time: formattedTime,
      end_time: formattedTime,
      status: 'ASSIGNED',
    };

    console.log('Updating assignment:', updatedAssignment);
    updateAssignmentMutation.mutate(updatedAssignment);
  };

  const handleCloseError = () => {
    setError(null);
  };

  return (
    <Container maxWidth="xl">
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <DragDropContext onDragEnd={onDragEnd}>
          <Box display="flex" gap={3}>
            <Box flex={1}>
              <TimetableView 
                assignments={assignments}
                isLoading={isLoading}
              />
            </Box>
            <UnassignedTasks assignments={assignments} />
          </Box>
        </DragDropContext>
      </Paper>
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Schedule; 