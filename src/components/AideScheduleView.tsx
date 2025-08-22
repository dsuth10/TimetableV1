import React, { useState, useEffect } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress, 
  Alert,
  Divider,
  Chip,
  Avatar
} from '@mui/material';
import { Assignment } from '../types/assignment';
import { TeacherAide } from '../types';
import UnassignedTasks from './UnassignedTasks';
import TimetableGrid from './TimetableGrid/TimetableGrid';
import ConflictResolutionModal from './ConflictResolutionModal';

interface AideScheduleViewProps {
  aide: TeacherAide;
  allAssignments: Assignment[];
  allUnassignedTasks: Assignment[];
  absences: any[];
  isLoading: boolean;
  onAssignmentUpdate: (assignment: Assignment) => Promise<void>;
}

// Helper function to get day name from date string
const getDayFromDate = (dateString: string): string => {
  const date = new Date(dateString);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

// Helper function to add day field to assignments
const addDayToAssignments = (assignments: Assignment[]): Assignment[] => {
  return assignments.map(assignment => ({
    ...assignment,
    day: getDayFromDate(assignment.date)
  }));
};

const AideScheduleView: React.FC<AideScheduleViewProps> = ({
  aide,
  allAssignments,
  allUnassignedTasks,
  absences,
  isLoading,
  onAssignmentUpdate
}) => {
  const [localAssignments, setLocalAssignments] = useState<Assignment[]>([]);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<{
    conflictingAssignment: Assignment;
    newAssignmentData: Partial<Assignment>;
    originalAssignment: Assignment;
  } | null>(null);

  // Filter assignments for this specific aide and add day field
  const aideAssignments = addDayToAssignments(
    allAssignments.filter(a => a.aide_id === aide.id)
  );
  
  // Filter unassigned tasks (these can be assigned to any aide)
  const unassignedTasks = allUnassignedTasks.filter(task => task.status === 'UNASSIGNED');

  useEffect(() => {
    setLocalAssignments(aideAssignments);
  }, [aideAssignments]);

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

    // Find the assignment being dragged
    const assignment = [...aideAssignments, ...unassignedTasks].find(
      a => a.id.toString() === draggableId
    );
    
    if (!assignment) return;

    // Determine the destination aide/day/time
    const [destAideIdStr, destDay, destTimeSlot] = destination.droppableId.split('-');
    const destAideId: number | null = destAideIdStr ? parseInt(destAideIdStr) : null;

    // Validate parsed values
    if (destAideId === null || isNaN(destAideId) || !destDay || !destTimeSlot) {
      console.error('Invalid destination droppableId:', destination.droppableId);
      return;
    }

    // Calculate the date for the destination day (assuming current week)
    const today = new Date();
    const dayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].indexOf(destDay);
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - today.getDay() + 1 + dayIndex); // Get Monday + dayIndex

    // Prepare common update data
    const commonUpdateData: Partial<Assignment> = {
      date: targetDate.toISOString().split('T')[0],
      start_time: destTimeSlot,
      end_time: (parseInt(destTimeSlot.split(':')[0]) + 0.5).toString().padStart(2, '0') + ':00',
      aide_id: destAideId,
    };

    // Case 1: Dragging from Unassigned Tasks to Timetable
    if (source.droppableId === 'unassigned') {
      const updatedAssignment: Assignment = {
        ...assignment,
        ...commonUpdateData,
        status: 'ASSIGNED',
        start_time: commonUpdateData.start_time || assignment.start_time,
        end_time: commonUpdateData.end_time || assignment.end_time,
        date: commonUpdateData.date || assignment.date,
      } as Assignment;

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
          return;
        }

        // No conflict, proceed with assignment
        await onAssignmentUpdate(updatedAssignment);
      } catch (error) {
        console.error('Error assigning task:', error);
      }
    }
    // Case 2: Moving assignment within timetable
    else if (source.droppableId !== 'unassigned' && destination.droppableId !== 'unassigned') {
      const updatedAssignment: Assignment = {
        ...assignment,
        ...commonUpdateData,
        status: 'ASSIGNED',
        start_time: commonUpdateData.start_time || assignment.start_time,
        end_time: commonUpdateData.end_time || assignment.end_time,
        date: commonUpdateData.date || assignment.date,
      } as Assignment;

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
          return;
        }

        // No conflict, proceed with update
        await onAssignmentUpdate(updatedAssignment);
      } catch (error) {
        console.error('Error updating assignment:', error);
      }
    }
  };

  const handleConflictResolution = async (resolution: 'replace' | 'cancel') => {
    if (!conflictDetails) return;

    if (resolution === 'replace') {
      try {
        await onAssignmentUpdate(conflictDetails.newAssignmentData as Assignment);
      } catch (error) {
        console.error('Error resolving conflict:', error);
      }
    }

    setConflictModalOpen(false);
    setConflictDetails(null);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        {/* Aide Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar 
            sx={{ 
              bgcolor: aide.colour_hex || '#1976d2',
              width: 56,
              height: 56,
              mr: 2
            }}
          >
            {aide.name.split(' ').map(n => n[0]).join('')}
          </Avatar>
          <Box>
            <Typography variant="h5" component="h2">
              {aide.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {aide.qualifications}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Main Content */}
        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Left: Timetable Grid */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" gutterBottom>
              Weekly Schedule
            </Typography>
            <TimetableGrid
              assignments={localAssignments}
              teacherAides={[aide]}
              isLoading={false}
              absences={absences}
            />
          </Box>

          {/* Right: Unassigned Tasks */}
          <Box sx={{ width: 350, flexShrink: 0 }}>
            <Typography variant="h6" gutterBottom>
              Unassigned Tasks
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Drag tasks here to assign them to {aide.name}
            </Typography>
            <UnassignedTasks assignments={unassignedTasks} />
          </Box>
        </Box>
      </Paper>

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        open={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        onResolve={handleConflictResolution}
        conflictDetails={conflictDetails}
      />
    </DragDropContext>
  );
};

export default AideScheduleView;
