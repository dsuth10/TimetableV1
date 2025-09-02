import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
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
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Assignment } from '../types/assignment';
import { TeacherAide } from '../types';
import UnassignedTasks from './UnassignedTasks';
import TimetableGrid from './TimetableGrid/TimetableGrid';
import ConflictResolutionModal from './ConflictResolutionModal';
import DurationModal from './DurationModal';
import { useUIStore } from '../store/stores/uiStore';

interface AideScheduleViewProps {
  aide: TeacherAide;
  allAssignments: Assignment[];
  allUnassignedTasks: Assignment[];
  absences: any[];
  isLoading: boolean;
  onAssignmentUpdate: (assignment: Assignment) => Promise<void>;
  weekStartDate?: Date; // Optional week start date for dynamic date calculation
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
  onAssignmentUpdate,
  weekStartDate
}) => {
  const [localAssignments, setLocalAssignments] = useState<Assignment[]>([]);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<{
    conflictingAssignment: Assignment;
    newAssignmentData: Assignment;
    originalAssignment: Assignment;
  } | null>(null);
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);
  const { addToast } = useUIStore();
  
  // Duration modal state for flexible tasks
  const [durationModalOpen, setDurationModalOpen] = useState(false);
  const [durationModalData, setDurationModalData] = useState<{
    assignment: Assignment;
    dropTime: string;
    dropDay: string;
    dropAideId: number;
  } | null>(null);

  // Force re-render key to ensure draggable elements are properly registered
  const [renderKey, setRenderKey] = useState(0);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - dow + 1);
    monday.setHours(0,0,0,0);
    return monday;
  });

  // Memoize assignments for this specific aide and add day field
  const aideAssignments = useMemo(() => {
    return addDayToAssignments(
      allAssignments.filter(a => a.aide_id === aide.id)
    );
  }, [allAssignments, aide.id]);
  
  // Memoize unassigned tasks (these can be assigned to any aide)
  const unassignedTasks = useMemo(() => {
    return allUnassignedTasks.filter(task => task.status === 'UNASSIGNED');
  }, [allUnassignedTasks]);

  useEffect(() => {
    setLocalAssignments(aideAssignments);
  }, [aideAssignments]);

  // Force re-render when assignments change to ensure draggable registration
  useEffect(() => {
    setRenderKey(prev => prev + 1);
  }, [allAssignments, allUnassignedTasks]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const assignment = [...aideAssignments, ...unassignedTasks].find(
      a => a.id.toString() === draggableId
    );
    if (!assignment) return;

    // Handle drop to Unassigned panel
    if (destination.droppableId === 'unassigned') {
      const updated = { ...assignment, aide_id: null, status: 'UNASSIGNED' as const } as Assignment;
      try {
        await onAssignmentUpdate(updated);
      } catch (e) {
        // Let caller surface error/toast if needed
      }
      return;
    }

    const [destAideIdStr, destDay, destTimeSlot] = destination.droppableId.split('-');
    const destAideId: number | null = destAideIdStr ? parseInt(destAideIdStr) : null;
    if (destAideId === null || isNaN(destAideId) || !destDay || !destTimeSlot) {
      console.error('Invalid destination droppableId:', destination.droppableId);
      return;
    }

    const today = new Date();
    const dayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].indexOf(destDay);
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - today.getDay() + 1 + dayIndex);

    const updatedAssignment: Assignment = {
      ...assignment,
      aide_id: destAideId,
      date: targetDate.toISOString().split('T')[0],
      start_time: destTimeSlot,
      end_time: (parseInt(destTimeSlot.split(':')[0]) + 0.5).toString().padStart(2, '0') + ':00',
      status: 'ASSIGNED',
    } as Assignment;

    try {
      await onAssignmentUpdate(updatedAssignment);
    } catch (error: any) {
      // If backend returned 409 with conflict details, open modal
      const status = error?.response?.status;
      const data = error?.response?.data;
      if (status === 409 && data) {
        const conflict = data.conflict || data.conflicting_assignment || null;
        if (conflict) {
          setConflictDetails({
            conflictingAssignment: conflict as Assignment,
            newAssignmentData: updatedAssignment,
            originalAssignment: assignment,
          });
          setConflictModalOpen(true);
          addToast({ message: 'Scheduling conflict detected. Choose how to resolve.', type: 'info', duration: 5000 });
        }
      }
    }
  };

  const handleConflictResolve = async (resolution: 'replace' | 'cancel') => {
    if (!conflictDetails) return;

    // Close modal immediately to prevent multiple clicks
    setConflictModalOpen(false);

    if (resolution === 'replace') {
      try {
        setIsResolvingConflict(true);
        console.log('🔄 Resolving conflict by replacing assignment...');
        
        // Step 1: Unassign the conflicting assignment (preserve its date/time)
        console.log('Step 1: Unassigning conflicting assignment...');
        const unassignedConflicting = { 
          ...conflictDetails.conflictingAssignment, 
          aide_id: null, 
          status: 'UNASSIGNED' as const 
        } as Assignment;
        
        await onAssignmentUpdate(unassignedConflicting);
        console.log('✅ Conflicting assignment unassigned successfully');

        // Step 2: Apply the desired new assignment
        console.log('Step 2: Applying new assignment...');
        await onAssignmentUpdate(conflictDetails.newAssignmentData);
        console.log('✅ New assignment applied successfully');

        console.log('🎉 Conflict resolved successfully!');
        addToast({ message: 'Conflict resolved successfully', type: 'success', duration: 4000 });

      } catch (error) {
        console.error('❌ Failed to resolve conflict by replacing:', error);
        addToast({ message: 'Failed to resolve conflict. Please try again.', type: 'error', duration: 6000 });
      } finally {
        setIsResolvingConflict(false);
      }
    } else { // action === 'cancel'
      console.log('🚫 Conflict resolution cancelled by user');
      addToast({ message: 'Conflict resolution cancelled', type: 'info', duration: 3000 });
      // No action needed - the original state is preserved
    }
    
    // Clear conflict details
    setConflictDetails(null);
  };

  const handleDurationConfirm = async (assignment: Assignment, duration: number) => {
    try {
      // Check for conflicts first
      const conflictCheck = await fetch(`/api/assignments/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aide_id: assignment.aide_id,
          date: assignment.date,
          start_time: assignment.start_time,
          end_time: assignment.end_time,
        }),
      });
      const conflictData = await conflictCheck.json();

      if (conflictData.has_conflict) {
        setConflictDetails({
          conflictingAssignment: conflictData.conflicting_assignment,
          newAssignmentData: assignment,
          originalAssignment: assignment,
        });
        setConflictModalOpen(true);
        return;
      }

      // No conflict, proceed with assignment
      await onAssignmentUpdate(assignment);
    } catch (error) {
      console.error('Error assigning flexible task:', error);
    }
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
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="h6" gutterBottom>
                Weekly Schedule
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton size="small" onClick={() => setCurrentWeekStart(prev => { const d = new Date(prev); d.setDate(prev.getDate() - 7); return d; })} aria-label="Previous week">
                  <ChevronLeftIcon />
                </IconButton>
                <Typography variant="body2">
                  Week of {currentWeekStart.toLocaleDateString()} - {new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + 4).toLocaleDateString()}
                </Typography>
                <IconButton size="small" onClick={() => setCurrentWeekStart(prev => { const d = new Date(prev); d.setDate(prev.getDate() + 7); return d; })} aria-label="Next week">
                  <ChevronRightIcon />
                </IconButton>
                <Button size="small" onClick={() => setCurrentWeekStart(() => { const t = new Date(); const dow = t.getDay(); const m = new Date(t); m.setDate(t.getDate() - dow + 1); m.setHours(0,0,0,0); return m; })}>Today</Button>
              </Stack>
            </Stack>
            <TimetableGrid
              assignments={localAssignments}
              teacherAides={[aide]}
              isLoading={false}
              absences={absences}
              renderKey={renderKey}
              weekStartDate={weekStartDate || currentWeekStart}
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
            <UnassignedTasks assignments={unassignedTasks} renderKey={renderKey} />
          </Box>
        </Box>
      </Paper>

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        open={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        onResolve={handleConflictResolve}
        conflictDetails={conflictDetails}
        isResolving={isResolvingConflict}
      />
      
      <DurationModal
        open={durationModalOpen}
        onClose={() => setDurationModalOpen(false)}
        onConfirm={handleDurationConfirm}
        assignment={durationModalData?.assignment || null}
        dropTime={durationModalData?.dropTime || ''}
        dropDay={durationModalData?.dropDay || ''}
        dropAideId={durationModalData?.dropAideId || 0}
      />
    </DragDropContext>
  );
};

export default AideScheduleView;
