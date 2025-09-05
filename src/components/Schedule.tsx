import React, { useState, useEffect } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Paper, Typography, Box, CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem, IconButton, Button, Stack } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
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
import { useUIStore } from '../store/stores/uiStore';

const Schedule: React.FC = () => {
  // Initialize week state before hooks that depend on it
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - dow + 1);
    monday.setHours(0,0,0,0);
    return monday;
  });

  const { assignments, isLoading: assignmentsLoading, error: assignmentsError, updateAssignment } = useAssignments(currentWeekStart);
  const { teacherAides, isLoading: aidesLoading, error: aidesError } = useTeacherAides();
  const { absences, isLoading: absencesLoading, error: absencesError } = useAbsences(currentWeekStart);
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
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);
  const [unassignedTasks, setUnassignedTasks] = useState<Task[]>([]);
  const { addToast } = useUIStore();
  

  useEffect(() => {
    console.log('Schedule: assignments changed', assignments);
    if (Array.isArray(assignments)) {
      setLocalAssignments(assignments);
    } else {
      console.error('Assignments is not an array:', assignments);
      setLocalAssignments([]);
    }
  }, [assignments]);

  // Expose current localAssignments for Cypress assertions (test-only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__assignments = localAssignments;
    }
  }, [localAssignments]);

  // Headless-friendly trigger: listen for a custom event to invoke the same onDragEnd logic
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (evt: Event) => {
      try {
        const anyEvt = evt as any;
        const result = anyEvt?.detail;
        if (result && typeof result === 'object') {
          const fn = (window as any).__scheduleHandleDragEnd;
          if (typeof fn === 'function') {
            fn(result);
          }
        }
      } catch (e) {
        console.error('Failed to handle test-drop event', e);
      }
    };
    window.addEventListener('test-drop', handler as EventListener);
    (window as any).__harnessReady = true;
    return () => {
      window.removeEventListener('test-drop', handler as EventListener);
    };
  }, []);

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
      if (!assignment) {
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
          return assignment ? [...filtered, assignment] : filtered;
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

      // Calculate the date for the destination day based on currentWeekStart (Monday)
      const monday = currentWeekStart instanceof Date ? new Date(currentWeekStart) : (() => { const t = new Date(); const dow = t.getDay(); const m = new Date(t); m.setDate(t.getDate() - dow + 1); m.setHours(0,0,0,0); return m; })();
      const dayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].indexOf(destDay);
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + dayIndex);

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
                date: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`,
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
                      date: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`,
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
                  addToast({ message: 'Scheduling conflict detected. Choose how to resolve.', type: 'info', duration: 5000 });
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
          date: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`,
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

          // If conflict (409), open modal with details; fallback to preflight check
          const status = (error as any)?.response?.status;
          const data = (error as any)?.response?.data;
          let conflict = data?.conflict || data?.conflicting_assignment || null;
          if (!conflict && status === 409) {
            try {
              const res = await fetch('/api/assignments/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  aide_id: updatedAssignment.aide_id,
                  date: updatedAssignment.date,
                  start_time: updatedAssignment.start_time,
                  end_time: updatedAssignment.end_time,
                }),
              });
              const body = await res.json().catch(() => ({}));
              conflict = body?.conflicting_assignment || null;
            } catch {}
          }
          if (status === 409 && conflict) {
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
    }
  };

  // Expose handleDragEnd for headless/test harnesses without referencing it before initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__scheduleHandleDragEnd = handleDragEnd as any;
      return () => {
        if ((window as any).__scheduleHandleDragEnd === handleDragEnd) {
          delete (window as any).__scheduleHandleDragEnd;
        }
      };
    }
  }, [handleDragEnd]);

  // (moved to effect below)

  // Expose a test-only helper for Cypress to trigger a drop without relying on complex DnD event chains
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__triggerDrop = (draggableId: string, destDroppableId: string) => {
        const result: any = {
          draggableId,
          source: { droppableId: 'unassigned', index: 0 },
          destination: { droppableId: destDroppableId, index: 0 },
          reason: 'DROP',
          type: 'DEFAULT',
        };
        const fn = (window as any).__scheduleHandleDragEnd;
        if (typeof fn === 'function') {
          fn(result);
        }
      };
      return () => {
        delete (window as any).__triggerDrop;
      };
    }
  }, []);

  // Cypress harness: assign an existing assignment id to a destination slot deterministically
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__assignToSlot = async (assignmentId: number, destDroppableId: string) => {
        try {
          const [destAideIdStr, destDay, destTimeSlot] = String(destDroppableId).split('-');
          const destAideId = parseInt(destAideIdStr, 10);
          if (!destAideId || !destDay || !destTimeSlot) return;

          // Compute date for the destination day based on currentWeekStart
          const daysIndexMap: Record<string, number> = { 'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4 };
          const dayIndex = daysIndexMap[destDay] ?? 0;
          const base = currentWeekStart instanceof Date ? new Date(currentWeekStart) : new Date();
          base.setHours(0,0,0,0);
          const targetDate = new Date(base);
          targetDate.setDate(base.getDate() + dayIndex);
          const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

          // Compute end time (30 min after start)
          const [hStr, mStr] = destTimeSlot.split(':');
          const h = parseInt(hStr, 10);
          const m = parseInt(mStr, 10);
          const end = new Date();
          end.setHours(h, m + 30, 0, 0);
          const endStr = end.toTimeString().slice(0, 5);
          const normalizedStart = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
          const normalizedEnd = endStr.includes(':') ? endStr.split(':').slice(0,2).join(':') : endStr;

          let updated: Assignment | null = null;
          setLocalAssignments(prev => {
            const existing = prev.find(a => a.id === assignmentId);
            if (!existing) {
              return prev;
            }
            updated = {
              ...existing,
              aide_id: destAideId,
              date: targetDateStr,
              day: destDay as any,
              start_time: normalizedStart,
              end_time: normalizedEnd,
              status: 'ASSIGNED',
            } as Assignment;
            const filtered = prev.filter(a => a.id !== assignmentId);
            return [...filtered, updated!];
          });

          if (updated) {
            await updateAssignment(assignmentId, updated);
          }
        } catch (e) {
          // no-op; Cypress will surface failures via intercept/DOM asserts
        }
      };
    }
  }, [updateAssignment, currentWeekStart]);

  const handleConflictResolve = async (action: 'replace' | 'cancel') => {
    if (!conflictDetails) return;

    const { conflictingAssignment, newAssignmentData, originalAssignment } = conflictDetails;

    if (action === 'replace') {
      try {
        setIsResolvingConflict(true);
        // Atomic replace endpoint
        const payload: any = {
          conflicting_assignment_id: conflictingAssignment.id,
          aide_id: (newAssignmentData as any).aide_id,
          date: (newAssignmentData as any).date,
          start_time: (newAssignmentData as any).start_time,
          end_time: (newAssignmentData as any).end_time,
        };
        if ((newAssignmentData as any).id) {
          payload.existing_assignment_id = (newAssignmentData as any).id;
        } else {
          payload.task_id = (newAssignmentData as any).task_id;
        }
        const res = await fetch('/api/assignments/replace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          if (res.status === 409) {
            const body = await res.json().catch(() => ({}));
            const nextConflict = body?.conflicting_assignment || body?.conflict || null;
            if (nextConflict) {
              setConflictDetails({
                conflictingAssignment: nextConflict as Assignment,
                newAssignmentData,
                originalAssignment,
              });
              addToast({ message: 'Still conflicting; review the new conflict.', type: 'warning', duration: 5000 });
              return;
            }
          }
          throw new Error('Failed to replace');
        }
        const body = await res.json();
        const created: Assignment | undefined = body?.assignment;
        const unassigned: Assignment | undefined = body?.unassigned;

        setLocalAssignments(prevAssignments => {
          let next = prevAssignments.slice();
          if (unassigned) {
            next = next.filter(a => a.id !== unassigned.id);
            next.push(unassigned);
          }
          if (created) {
            next = next.filter(a => a.id !== created.id);
            next.push(created);
          }
          return next;
        });
        addToast({ message: 'Conflict resolved successfully', type: 'success', duration: 4000 });
      } catch (error) {
        console.error('Failed to resolve conflict by replacing:', error);
        // Revert local state if API update fails for replacement
        setLocalAssignments(prevAssignments => {
          const filtered = prevAssignments.filter(a => a.id !== conflictingAssignment.id && a.id !== ((newAssignmentData as any).id || -1));
          return [...filtered, conflictingAssignment, originalAssignment]; // Revert both
        });
        addToast({ message: 'Failed to resolve conflict. Please try again.', type: 'error', duration: 6000 });
      } finally {
        setIsResolvingConflict(false);
      }
    } else { // action === 'cancel'
      // Revert local state to original (no change)
      setLocalAssignments(prevAssignments => {
        const filtered = prevAssignments.filter(a => a.id !== ((newAssignmentData as any).id || -1)); // Remove the temp new assignment if it was optimistically added
        return [...filtered, originalAssignment]; // Add back original if it was removed
      });
      addToast({ message: 'Conflict resolution cancelled', type: 'info', duration: 3000 });
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
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
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
                {typeof window !== 'undefined' && (window as any).Cypress && (
                  <Button
                    size="small"
                    variant="outlined"
                    data-cy="simulate-drop"
                    onClick={() => (handleDragEnd as any)({
                      draggableId: 'assignment-1',
                      source: { droppableId: 'unassigned', index: 0 },
                      destination: { droppableId: '1-Monday-08:00', index: 0 },
                      reason: 'DROP',
                      type: 'DEFAULT',
                    })}
                  >
                    Simulate Drop
                  </Button>
                )}
              </Stack>

              <TimetableGrid 
                assignments={localAssignments}
                teacherAides={selectedAide ? [selectedAide] : []}
                isLoading={assignmentsLoading || aidesLoading || absencesLoading}
                absences={absences}
                weekStartDate={currentWeekStart}
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
                is_flexible: (a as any).is_flexible ?? false,
              }));

            const unassignedTaskItems: UnassignedItem[] = unassignedTasks
              .map(t => ({
                kind: 'task',
                id: t.id,
                title: t.title,
                category: t.category,
                start_time: t.start_time,
                end_time: t.end_time,
                is_flexible: t.is_flexible ?? false,
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
          isResolving={isResolvingConflict}
        />
      )}
    </Box>
  );
};

export default Schedule;
