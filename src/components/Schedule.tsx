import React, { useState, useEffect } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Paper, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { useAssignments } from '../hooks/useAssignments';
import { useTeacherAides } from '../hooks/useTeacherAides';
import { useAbsences } from '../hooks/useAbsences';
import UnassignedTasks from './UnassignedTasks';
import TimetableGrid from './TimetableGrid/TimetableGrid';
import type { Assignment } from '../types/assignment';
import ConflictResolutionModal from './ConflictResolutionModal';

const Schedule: React.FC = () => {
  const { assignments, isLoading: assignmentsLoading, error: assignmentsError, updateAssignment } = useAssignments();
  const { teacherAides, isLoading: aidesLoading, error: aidesError } = useTeacherAides();
  const { absences, isLoading: absencesLoading, error: absencesError } = useAbsences();
  const [localAssignments, setLocalAssignments] = useState<Assignment[]>([]);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<{
    conflictingAssignment: Assignment;
    newAssignmentData: Partial<Assignment>;
    originalAssignment: Assignment;
  } | null>(null);

  useEffect(() => {
    console.log('Schedule: assignments changed', assignments);
    if (Array.isArray(assignments)) {
      setLocalAssignments(assignments);
    } else {
      console.error('Assignments is not an array:', assignments);
      setLocalAssignments([]);
    }
  }, [assignments]);

  const handleDragEnd = async (result: DropResult) => {
    console.log('🎯 DRAG END EVENT:', result);
    console.log('Source:', result.source);
    console.log('Destination:', result.destination);
    console.log('Draggable ID:', result.draggableId);
    
    if (!result.destination) {
      console.log('❌ No destination detected - drag cancelled');
      console.log('This means the drop zones are not being recognized');
      return;
    }

    const { source, destination, draggableId } = result;

    // If dropping in the same place, do nothing
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      console.log('Dropped in same location, no action needed');
      return;
    }

    const assignment = localAssignments.find(a => a.id.toString() === draggableId);
    if (!assignment) {
      console.error('Assignment not found for draggableId:', draggableId);
      return;
    }

    console.log('Found assignment:', assignment);
    console.log('Source:', source.droppableId);
    console.log('Destination:', destination.droppableId);

    // Handle dropping back to unassigned
    if (destination.droppableId === 'unassigned') {
      console.log('Dropping to unassigned tasks');
      const updatedAssignment = {
        ...assignment,
        aide_id: null,
        status: 'UNASSIGNED' as const,
        date: undefined,
        day: undefined,
        start_time: undefined,
        end_time: undefined,
      } as unknown as Assignment;

      try {
        setLocalAssignments((prevAssignments) => {
          const filtered = prevAssignments.filter((a) => a.id !== assignment.id);
          return [...filtered, updatedAssignment];
        });
        await updateAssignment(assignment.id, updatedAssignment);
        console.log('Successfully moved to unassigned');
      } catch (error) {
        console.error('Failed to update assignment:', error);
        // Revert local state if API update fails
        setLocalAssignments((prevAssignments) => {
          const filtered = prevAssignments.filter((a) => a.id !== updatedAssignment.id);
          return [...filtered, assignment];
        });
      }
      return;
    }

    // Handle dropping to timetable slots
    if (destination.droppableId !== 'unassigned') {
      console.log('Dropping to timetable slot:', destination.droppableId);
      
      // Parse destination droppable ID (format: "aideId-day-time")
      const parts = destination.droppableId.split('-');
      if (parts.length !== 3) {
        console.error('Invalid destination format:', destination.droppableId);
        return;
      }

      const [destAideIdStr, destDay, destTimeSlot] = parts;
      const destAideId = parseInt(destAideIdStr);

      if (isNaN(destAideId) || !destDay || !destTimeSlot) {
        console.error('Invalid parsed values:', { destAideId, destDay, destTimeSlot });
        return;
      }

      // Calculate the date for the destination day
      const today = new Date();
      const dayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].indexOf(destDay);
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - today.getDay() + 1 + dayIndex);

      // Calculate end time (30 minutes after start time)
      const startHour = parseInt(destTimeSlot.split(':')[0]);
      const startMinute = parseInt(destTimeSlot.split(':')[1]);
      const endTime = new Date();
      endTime.setHours(startHour, startMinute + 30, 0, 0);
      const endTimeString = endTime.toTimeString().slice(0, 5);

      // Prepare update data
      const updatedAssignment: Assignment = {
        ...assignment,
        aide_id: destAideId,
        date: targetDate.toISOString().split('T')[0],
        day: destDay,
        start_time: destTimeSlot,
        end_time: endTimeString,
        status: 'ASSIGNED',
      } as Assignment;

      console.log('Updating assignment:', updatedAssignment);

      try {
        // Optimistic update
        setLocalAssignments((prevAssignments) => {
          const filtered = prevAssignments.filter((a) => a.id !== assignment.id);
          return [...filtered, updatedAssignment];
        });

        await updateAssignment(assignment.id, updatedAssignment);
        console.log('Successfully updated assignment');
      } catch (error) {
        console.error('Failed to update assignment:', error);
        // Revert local state on error
        setLocalAssignments((prevAssignments) => {
          const filtered = prevAssignments.filter((a) => a.id !== updatedAssignment.id);
          return [...filtered, assignment];
        });
      }
    }
  };

  const handleConflictResolve = async (action: 'replace' | 'cancel') => {
    if (!conflictDetails) return;

    const { conflictingAssignment, newAssignmentData, originalAssignment } = conflictDetails;

    if (action === 'replace') {
      try {
        // Step 1: Unassign the conflicting assignment
        const unassignedConflicting = { ...conflictingAssignment, aide_id: null, status: 'UNASSIGNED' as const, date: undefined, day: undefined, start_time: undefined, end_time: undefined } as unknown as Assignment;
        await updateAssignment(conflictingAssignment.id, unassignedConflicting);

        // Step 2: Assign the new assignment
        const assignedNew = { ...newAssignmentData, status: 'ASSIGNED' } as Assignment;
        await updateAssignment(assignedNew.id as number, assignedNew);

        // Update local state to reflect both changes
        setLocalAssignments(prevAssignments => {
          const filtered = prevAssignments.filter(a => a.id !== conflictingAssignment.id && a.id !== assignedNew.id);
          return [...filtered, unassignedConflicting, assignedNew];
        });

      } catch (error) {
        console.error('Failed to resolve conflict by replacing:', error);
        // Revert local state if API update fails for replacement
        setLocalAssignments(prevAssignments => {
          const filtered = prevAssignments.filter(a => a.id !== conflictingAssignment.id && a.id !== (newAssignmentData.id || -1));
          return [...filtered, conflictingAssignment, originalAssignment]; // Revert both
        });
      }
    } else { // action === 'cancel'
      // Revert local state to original (no change)
      setLocalAssignments(prevAssignments => {
        const filtered = prevAssignments.filter(a => a.id !== (newAssignmentData.id || -1)); // Remove the temp new assignment if it was optimistically added
        return [...filtered, originalAssignment]; // Add back original if it was removed
      });
    }
    setConflictModalOpen(false);
    setConflictDetails(null);
  };

  if (assignmentsLoading || aidesLoading || absencesLoading || !Array.isArray(localAssignments) || !Array.isArray(teacherAides) || !Array.isArray(absences)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress data-testid="loading-spinner" />
      </Box>
    );
  }

  if (assignmentsError || aidesError || absencesError) {
    const errorMessage = assignmentsError instanceof Error 
      ? assignmentsError.message 
      : aidesError instanceof Error 
        ? aidesError.message 
        : absencesError instanceof Error
        ? absencesError.message
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
              <TimetableGrid 
                assignments={localAssignments}
                teacherAides={teacherAides}
                isLoading={assignmentsLoading || aidesLoading || absencesLoading}
                absences={absences}
              />
            </Paper>
          </Box>
        </Box>
        <UnassignedTasks assignments={localAssignments} />
      </DragDropContext>

      {conflictDetails && (
        <ConflictResolutionModal
          open={conflictModalOpen}
          onClose={() => handleConflictResolve('cancel')}
          onResolve={handleConflictResolve}
          conflictDetails={conflictDetails}
        />
      )}
    </Box>
  );
};

export default Schedule;
