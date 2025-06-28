import React, { useState, useEffect } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { Paper, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { useAssignments } from '../hooks/useAssignments';
import { useTeacherAides } from '../hooks/useTeacherAides';
import UnassignedTasks from './UnassignedTasks';
import TimetableView from './TimetableView';
import type { Assignment } from '../types/index';

const Schedule: React.FC = () => {
  const { assignments, isLoading: assignmentsLoading, error: assignmentsError, updateAssignment } = useAssignments();
  const { teacherAides, isLoading: aidesLoading, error: aidesError } = useTeacherAides();
  const [localAssignments, setLocalAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    if (Array.isArray(assignments)) {
      setLocalAssignments(assignments);
    } else {
      console.error('Assignments is not an array:', assignments);
      setLocalAssignments([]);
    }
  }, [assignments]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // If dropping in the same place, do nothing
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const assignment = localAssignments.find(a => a.id.toString() === draggableId);
    if (!assignment) return;

    // Handle dropping from unassigned tasks to timetable
    if (source.droppableId === 'unassigned') {
      const [day, timeSlot] = destination.droppableId.split('-');
      
      const updatedAssignment: Assignment = {
        ...assignment,
        day,
        time_slot: timeSlot,
        status: 'ASSIGNED' as const,
        task_category: assignment.task_category,
        start_time: assignment.start_time,
        end_time: assignment.end_time,
        teacher_aide_id: assignment.teacher_aide_id
      };

      try {
        // Update local state immediately for better UX
        setLocalAssignments(prevAssignments => {
          const filtered = prevAssignments.filter(a => a.id !== assignment.id);
          return [...filtered, updatedAssignment];
        });

        // Then update the API
        await updateAssignment(assignment.id, updatedAssignment);
      } catch (error) {
        console.error('Failed to update assignment:', error);
        // Revert local state if API update fails
        setLocalAssignments(prevAssignments => {
          const filtered = prevAssignments.filter(a => a.id !== updatedAssignment.id);
          return [...filtered, assignment];
        });
      }
    }
    // Handle dropping from timetable to unassigned
    else if (destination.droppableId === 'unassigned') {
      const updatedAssignment: Assignment = {
        ...assignment,
        day: undefined,
        time_slot: undefined,
        status: 'UNASSIGNED' as const,
        teacher_aide_id: null
      };

      try {
        // Update local state immediately
        setLocalAssignments(prevAssignments => {
          const filtered = prevAssignments.filter(a => a.id !== assignment.id);
          return [...filtered, updatedAssignment];
        });

        // Then update the API
        await updateAssignment(assignment.id, updatedAssignment);
      } catch (error) {
        console.error('Failed to update assignment:', error);
        // Revert local state if API update fails
        setLocalAssignments(prevAssignments => {
          const filtered = prevAssignments.filter(a => a.id !== updatedAssignment.id);
          return [...filtered, assignment];
        });
      }
    }
  };

  if (assignmentsLoading || aidesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (assignmentsError || aidesError) {
    const errorMessage = assignmentsError instanceof Error 
      ? assignmentsError.message 
      : aidesError instanceof Error 
        ? aidesError.message 
        : 'An error occurred while loading data';

    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">
          {errorMessage}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100%' }} data-testid="schedule-container">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Box sx={{ flexGrow: 1, p: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Schedule
              </Typography>
              <TimetableView 
                assignments={localAssignments}
                teacherAides={teacherAides}
                isLoading={assignmentsLoading || aidesLoading}
              />
            </Paper>
          </Box>
        </Box>
        <UnassignedTasks assignments={localAssignments} />
      </DragDropContext>
    </Box>
  );
};

export default Schedule; 