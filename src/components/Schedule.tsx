import React, { useState, useEffect } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Paper, Typography, Box, CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { useAssignments } from '../hooks/useAssignments';
import { useTeacherAides } from '../hooks/useTeacherAides';
import { useAbsences } from '../hooks/useAbsences';
import UnassignedTasks from './UnassignedTasks';
import TimetableGrid from './TimetableGrid/TimetableGrid';
import type { Assignment } from '../types/assignment';
import ConflictResolutionModal from './ConflictResolutionModal';
import { useAidesStore } from '../store';
import { tasksApi } from '../services/tasksApi';
import type { Task } from '../types/task';
import type { UnassignedItem } from './UnassignedTasks';

const Schedule: React.FC = () => {
  const { assignments, isLoading: assignmentsLoading, error: assignmentsError, updateAssignment } = useAssignments();
  const { teacherAides, isLoading: aidesLoading, error: aidesError } = useTeacherAides();
  const { absences, isLoading: absencesLoading, error: absencesError } = useAbsences();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedAideIdInUrl = searchParams.get('aideId');
  const { selectedAideId, setSelectedAideId } = useAidesStore();
  const [localAssignments, setLocalAssignments] = useState<Assignment[]>([]);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<{
    conflictingAssignment: Assignment;
    newAssignmentData: Partial<Assignment>;
    originalAssignment: Assignment;
  } | null>(null);
  const [unassignedTasks, setUnassignedTasks] = useState<Task[]>([]);

  useEffect(() => {
    console.log('Schedule: assignments changed', assignments);
    if (Array.isArray(assignments)) {
      setLocalAssignments(assignments);
    } else {
      console.error('Assignments is not an array:', assignments);
      setLocalAssignments([]);
    }
  }, [assignments]);

  // Fetch unassigned Tasks (those without assignments)
  useEffect(() => {
    const fetchUnassignedTasks = async () => {
      try {
        const data = await tasksApi.getUnassigned();
        const tasks = Array.isArray((data as any)?.tasks) ? (data as any).tasks : Array.isArray(data) ? data : [];
        setUnassignedTasks(tasks);
      } catch (err) {
        console.error('Failed to fetch unassigned tasks', err);
        setUnassignedTasks([]);
      }
    };
    fetchUnassignedTasks();
  }, []);

  // Sync aide selection between URL, store, and available aides
  useEffect(() => {
    if (!Array.isArray(teacherAides) || teacherAides.length === 0) return;

    const aideIds = new Set(teacherAides.map(a => a.id));
    const urlId = selectedAideIdInUrl ? parseInt(selectedAideIdInUrl, 10) : null;
    const storeId = typeof selectedAideId === 'number' ? selectedAideId : null;

    let effectiveId: number | null = null;
    if (urlId && aideIds.has(urlId)) effectiveId = urlId;
    else if (storeId && aideIds.has(storeId)) effectiveId = storeId;
    else effectiveId = teacherAides[0]?.id ?? null;

    if (effectiveId == null) return;

    if (storeId !== effectiveId) setSelectedAideId(effectiveId);
    if (urlId !== effectiveId) {
      setSearchParams(prev => {
        const p = new URLSearchParams(prev);
        p.set('aideId', String(effectiveId));
        return p;
      }, { replace: true });
    }
  }, [teacherAides, selectedAideIdInUrl, selectedAideId, setSelectedAideId, setSearchParams]);

  const handleAideChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const nextId = Number(event.target.value);
    setSelectedAideId(nextId);
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set('aideId', String(nextId));
      return p;
    }, { replace: true });
  };

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

    // draggableId can be `assignment-<id>` or `task-<id>` for right panel items
    const isTaskDrag = draggableId.startsWith('task-');
    const isAssignDrag = draggableId.startsWith('assignment-');

    const draggableNumericId = (() => {
      const parts = draggableId.split('-');
      const last = parts[parts.length - 1];
      const parsed = parseInt(last, 10);
      return Number.isNaN(parsed) ? null : parsed;
    })();

    const assignment = !isTaskDrag
      ? localAssignments.find(a => a.id.toString() === (isAssignDrag ? String(draggableNumericId) : draggableId))
      : undefined;
    if (!assignment && !isTaskDrag) {
      console.error('Assignment not found for draggableId:', draggableId);
      return;
    }

    console.log('Found assignment:', assignment);
    console.log('Source:', source.droppableId);
    console.log('Destination:', destination.droppableId);

    // Handle dropping back to unassigned
    if (destination.droppableId === 'unassigned') {
      if (isTaskDrag) {
        // Task dragged back to unassigned panel: no-op (it is already unassigned)
        return;
      }
      console.log('Dropping to unassigned tasks');
      // Unassign while preserving original date/time to satisfy backend validation
      const updatedAssignment = {
        ...assignment,
        aide_id: null,
        status: 'UNASSIGNED' as const,
      } as Assignment;

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
      
      // Normalize time format to HH:MM (remove seconds if present)
      const normalizedStartTime = destTimeSlot.includes(':') ? destTimeSlot.split(':').slice(0, 2).join(':') : destTimeSlot;
      const normalizedEndTime = endTimeString.includes(':') ? endTimeString.split(':').slice(0, 2).join(':') : endTimeString;

      if (isTaskDrag) {
        // Create a new assignment from a Task (no existing assignment row)
        if (draggableNumericId == null) return;
        const newAssignmentPayload = {
          taskId: draggableNumericId,
          aideId: destAideId,
          day: destDay,
          startTime: destTimeSlot,
          // Duration: derive from task times if available, else 30m; we will compute endTime on the server or separately
          duration: 30,
        };
        try {
          // Compute date string for today-based weekday as used elsewhere
          const created = await (async () => {
            const res = await fetch('/api/assignments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                task_id: newAssignmentPayload.taskId,
                aide_id: newAssignmentPayload.aideId,
                date: targetDate.toISOString().split('T')[0],
                start_time: normalizedStartTime,
                end_time: normalizedEndTime,
              }),
            });
            if (!res.ok) {
              // If conflict (409), open modal using backend-provided payload
              if (res.status === 409) {
                const errBody = await res.json().catch(() => ({} as any));
                const conflict = (errBody && (errBody.conflict || errBody.conflicting_assignment)) || null;
                if (conflict) {
                  setConflictDetails({
                    conflictingAssignment: conflict as unknown as Assignment,
                    newAssignmentData: {
                      task_id: newAssignmentPayload.taskId as unknown as number,
                      aide_id: newAssignmentPayload.aideId,
                      date: targetDate.toISOString().split('T')[0],
                      start_time: normalizedStartTime,
                      end_time: normalizedEndTime,
                      status: 'ASSIGNED',
                    } as unknown as Partial<Assignment>,
                    originalAssignment: {
                      id: -1,
                      task_id: newAssignmentPayload.taskId as unknown as number,
                      aide_id: null,
                      date: '',
                      start_time: '',
                      end_time: '',
                      status: 'UNASSIGNED',
                    } as unknown as Assignment,
                  });
                  setConflictModalOpen(true);
                }
              }
              throw new Error('Failed to create assignment');
            }
            return res.json();
          })();

          // Insert created assignment into local state
          setLocalAssignments(prev => [...prev, created as Assignment]);
          // Remove the task from local unassignedTasks list
          setUnassignedTasks(prev => prev.filter(t => t.id !== draggableNumericId));
        } catch (e) {
          console.error('Failed to create assignment from task drag', e);
        }
      } else if (assignment) {
        // Move/update an existing assignment
        const updatedAssignment: Assignment = {
          ...assignment,
          aide_id: destAideId,
          date: targetDate.toISOString().split('T')[0],
          day: destDay,
          start_time: normalizedStartTime,
          end_time: normalizedEndTime,
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
        } catch (error: any) {
          console.error('Failed to update assignment:', error);
          // Revert local state on error
          setLocalAssignments((prevAssignments) => {
            const filtered = prevAssignments.filter((a) => a.id !== updatedAssignment.id);
            return [...filtered, assignment];
          });

          // If conflict (409), open modal with details
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
            }
          }
        }
      }
    }
  };

  const handleConflictResolve = async (action: 'replace' | 'cancel') => {
    if (!conflictDetails) return;

    const { conflictingAssignment, newAssignmentData, originalAssignment } = conflictDetails;

    if (action === 'replace') {
      try {
        // Step 1: Unassign the conflicting assignment (preserve its date/time)
        const unassignedConflicting = { ...conflictingAssignment, aide_id: null, status: 'UNASSIGNED' as const } as Assignment;
        await updateAssignment(conflictingAssignment.id, unassignedConflicting);

        // Step 2: Apply the desired new assignment
        if (newAssignmentData && (newAssignmentData as any).id) {
          // It was an update of an existing assignment
          const assignedNew = { ...newAssignmentData, status: 'ASSIGNED' } as Assignment;
          await updateAssignment((newAssignmentData as any).id as number, assignedNew);

          setLocalAssignments(prevAssignments => {
            const filtered = prevAssignments.filter(a => a.id !== conflictingAssignment.id && a.id !== (newAssignmentData as any).id);
            return [...filtered, unassignedConflicting, assignedNew];
          });
        } else {
          // It was a creation from a Task; create after unassigning the conflict
          const res = await fetch('/api/assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              task_id: (newAssignmentData as any).task_id,
              aide_id: (newAssignmentData as any).aide_id,
              date: (newAssignmentData as any).date,
              start_time: (newAssignmentData as any).start_time,
              end_time: (newAssignmentData as any).end_time,
            }),
          });
          if (!res.ok) throw new Error('Failed to create assignment after replace');
          const created = (await res.json()) as Assignment;

          setLocalAssignments(prevAssignments => {
            const filtered = prevAssignments.filter(a => a.id !== conflictingAssignment.id);
            return [...filtered, unassignedConflicting, created];
          });
        }

      } catch (error) {
        console.error('Failed to resolve conflict by replacing:', error);
        // Revert local state if API update fails for replacement
        setLocalAssignments(prevAssignments => {
          const filtered = prevAssignments.filter(a => a.id !== conflictingAssignment.id && a.id !== ((newAssignmentData as any).id || -1));
          return [...filtered, conflictingAssignment, originalAssignment]; // Revert both
        });
      }
    } else { // action === 'cancel'
      // Revert local state to original (no change)
      setLocalAssignments(prevAssignments => {
        const filtered = prevAssignments.filter(a => a.id !== ((newAssignmentData as any).id || -1)); // Remove the temp new assignment if it was optimistically added
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

  const selectedAide = Array.isArray(teacherAides)
    ? teacherAides.find(a => a.id === (typeof selectedAideId === 'number' ? selectedAideId : Number(selectedAideIdInUrl)))
    : undefined;

  return (
    <Box sx={{ display: 'flex', height: '100%' }} data-testid="schedule-container">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Box sx={{ flexGrow: 1, p: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Schedule
              </Typography>
              <Box sx={{ mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 260 }}>
                  <InputLabel id="aide-select-label">Select Teacher Aide</InputLabel>
                  <Select
                    labelId="aide-select-label"
                    id="aide-select"
                    label="Select Teacher Aide"
                    value={selectedAide ? selectedAide.id : ''}
                    onChange={handleAideChange as any}
                  >
                    {Array.isArray(teacherAides) && teacherAides.map((aide) => (
                      <MenuItem key={aide.id} value={aide.id}>
                        {aide.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <TimetableGrid 
                assignments={localAssignments}
                teacherAides={selectedAide ? [selectedAide] : []}
                isLoading={assignmentsLoading || aidesLoading || absencesLoading}
                absences={absences}
              />
            </Paper>
          </Box>
        </Box>
        {
          (() => {
            // Normalize combined unassigned items
            const unassignedAssignmentItems: UnassignedItem[] = localAssignments
              .filter(a => a.status === 'UNASSIGNED')
              .map(a => ({
                kind: 'assignment',
                id: a.id,
                title: a.task_title,
                category: a.task_category,
                start_time: a.start_time,
                end_time: a.end_time,
                is_flexible: a.is_flexible,
              }));

            const unassignedTaskItems: UnassignedItem[] = unassignedTasks
              .map(t => ({
                kind: 'task',
                id: t.id,
                title: t.title,
                category: t.category,
                start_time: t.start_time,
                end_time: t.end_time,
                is_flexible: t.is_flexible,
              }));

            const combined: UnassignedItem[] = [...unassignedAssignmentItems, ...unassignedTaskItems];
            return <UnassignedTasks items={combined} />;
          })()
        }
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
