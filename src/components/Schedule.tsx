import React, { useState, useEffect } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { Paper, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { useAssignments } from '../hooks/useAssignments';
import { useTeacherAides } from '../hooks/useTeacherAides';
import { useAbsences } from '../hooks/useAbsences';
import UnassignedTasks from './UnassignedTasks';
import TimetableGrid from './TimetableGrid/TimetableGrid';
import type { Assignment, TeacherAide } from '../types/index';
import ConflictResolutionModal from './ConflictResolutionModal';

const Schedule: React.FC = () => {
  const { assignments, isLoading: assignmentsLoading, error: assignmentsError, updateAssignment, deleteAssignment } = useAssignments();
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

    // Determine the source and destination aide/day/time
    let sourceAideId: number | null | undefined;
    let sourceDay: string | undefined;
    let sourceTimeSlot: string | undefined;

    if (source.droppableId !== 'unassigned') {
      [sourceAideId, sourceDay, sourceTimeSlot] = source.droppableId.split('-');
    }

    const [destAideIdStr, destDay, destTimeSlot] = destination.droppableId.split('-');
    const destAideId: number | null = destAideIdStr ? parseInt(destAideIdStr) : null; // Explicitly type as number | null

    // Validate parsed values
    if (destAideId === null || isNaN(destAideId) || !destDay || !destTimeSlot) {
      console.error('Invalid destination droppableId:', destination.droppableId);
      return;
    }

    // Prepare common update data
    const commonUpdateData: Partial<Assignment> = {
      date: new Date().toISOString().split('T')[0], // Use current date for now, will need to be dynamic
      day: destDay,
      start_time: destTimeSlot, // Use the start time of the destination slot
      end_time: (parseInt(destTimeSlot.split(':')[0]) + 0.5).toString().padStart(2, '0') + ':00', // Assuming 30 min slots
      aide_id: destAideId,
    };

    // Case 1: Dragging from Unassigned Tasks to Timetable
    if (source.droppableId === 'unassigned') {
      const updatedAssignment: Assignment = {
        ...assignment,
        ...commonUpdateData,
        status: 'ASSIGNED', // Explicitly assign the literal type
        // Ensure start_time, end_time, date are always strings when assigned
        start_time: commonUpdateData.start_time || assignment.start_time || '',
        end_time: commonUpdateData.end_time || assignment.end_time || '',
        date: commonUpdateData.date || assignment.date || '',
      } as Assignment; // Cast to Assignment to satisfy TypeScript

      try {
        // Check for conflicts first
        const conflictCheck = await fetch(`/api/assignments/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aide_id: updatedAssignment.aide_id,
            date: updatedAssignment.date,
            start_time: updatedAssignment.start_time,
            end_time: updatedAssignment.end_time,
          }),
        });
        const conflictData = await conflictCheck.json();

        if (conflictData.has_conflict) {
          setConflictDetails({
            conflictingAssignment: conflictData.conflicting_assignment,
            newAssignmentData: updatedAssignment,
            originalAssignment: assignment,
          });
          setConflictModalOpen(true);
          return; // Prevent immediate assignment if conflict
        }

        // Optimistic update
        setLocalAssignments((prevAssignments) => {
          const filtered = prevAssignments.filter((a) => a.id !== assignment.id);
          return [...filtered, updatedAssignment];
        });

        await updateAssignment(assignment.id, updatedAssignment);
      } catch (error) {
        console.error('Failed to update assignment:', error);
        // Revert local state on error
        setLocalAssignments((prevAssignments) => {
          const filtered = prevAssignments.filter((a) => a.id !== updatedAssignment.id);
          return [...filtered, assignment];
        });
      }
    }
    // Case 2: Dragging from Timetable to Unassigned Tasks
    else if (destination.droppableId === 'unassigned') {
      const updatedAssignment: Assignment = {
        ...assignment,
        aide_id: null,
        status: 'UNASSIGNED', // Explicitly assign the literal type
        date: undefined, // Clear date, day, time_slot for unassigned
        day: undefined,
        start_time: undefined,
        end_time: undefined,
      } as Assignment; // Cast to Assignment to satisfy TypeScript

      try {
        setLocalAssignments((prevAssignments) => {
          const filtered = prevAssignments.filter((a) => a.id !== assignment.id);
          return [...filtered, updatedAssignment];
        });
        await updateAssignment(assignment.id, updatedAssignment);
      } catch (error) {
        console.error('Failed to update assignment:', error);
        // Revert local state if API update fails
        setLocalAssignments((prevAssignments) => {
          const filtered = prevAssignments.filter((a) => a.id !== updatedAssignment.id);
          return [...filtered, assignment];
        });
      }
    }
    // Case 3: Dragging from one slot in Timetable to another slot in Timetable
    else {
      const updatedAssignment: Assignment = {
        ...assignment,
        ...commonUpdateData,
        status: 'ASSIGNED', // Explicitly assign the literal type
        start_time: commonUpdateData.start_time || assignment.start_time || '',
        end_time: commonUpdateData.end_time || assignment.end_time || '',
        date: commonUpdateData.date || assignment.date || '',
      } as Assignment; // Cast to Assignment to satisfy TypeScript

      try {
        // Check for conflicts
        const conflictCheck = await fetch(`/api/assignments/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aide_id: updatedAssignment.aide_id,
            date: updatedAssignment.date,
            start_time: updatedAssignment.start_time,
            end_time: updatedAssignment.end_time,
          }),
        });
        const conflictData = await conflictCheck.json();

        if (conflictData.has_conflict) {
          setConflictDetails({
            conflictingAssignment: conflictData.conflicting_assignment,
            newAssignmentData: updatedAssignment,
            originalAssignment: assignment,
          });
          setConflictModalOpen(true);
          return; // Prevent immediate assignment if conflict
        }

        setLocalAssignments((prevAssignments) => {
          const filtered = prevAssignments.filter((a) => a.id !== assignment.id);
          return [...filtered, updatedAssignment];
        });
        await updateAssignment(assignment.id, updatedAssignment);
      } catch (error) {
        console.error('Failed to update assignment:', error);
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
        const unassignedConflicting = { ...conflictingAssignment, aide_id: null, status: 'UNASSIGNED', date: undefined, day: undefined, start_time: undefined, end_time: undefined } as Assignment;
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
          conflictingAssignment={conflictDetails.conflictingAssignment}
          newAssignmentData={conflictDetails.newAssignmentData}
        />
      )}
    </Box>
  );
};

export default Schedule;
