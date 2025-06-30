import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Typography, Paper } from '@mui/material';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { fetchTimetableData } from '../store/slices/timetableSlice';
import AideTimetable from '../components/AideTimetable';
import UnassignedTaskList from '../components/UnassignedTaskList';
import ConflictResolutionModal from '../components/ConflictResolutionModal';
import { assignmentAPI } from '../services/api';

function Schedule() {
  const dispatch = useDispatch();
  const { aides, assignments, absences, loading, error } = useSelector(state => state.timetable);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  // TODO: Add state for conflict data

  const handleUpdateAssignmentStatus = async (assignmentId, status) => {
    try {
      await assignmentAPI.update(assignmentId, { status });
      dispatch(fetchTimetableData()); // Re-fetch data to update UI
    } catch (err) {
      console.error('Failed to update assignment status:', err);
      // TODO: Show error to user
    }
  };

  useEffect(() => {
    dispatch(fetchTimetableData());
  }, [dispatch]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <DndProvider backend={HTML5Backend}>
      <Box sx={{ p: 3, display: 'flex', gap: 4, minHeight: '100vh' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" sx={{ mb: 3 }}>Schedule</Typography>
          {aides && aides.length > 0 ? (
            aides.map(aide => (
              <AideTimetable
                key={aide.id}
                aide={aide}
                assignments={assignments.filter(a => a.aideId === aide.id)}
                absences={absences.filter(abs => abs.aideId === aide.id)}
                onUpdateAssignmentStatus={handleUpdateAssignmentStatus}
              />
            ))
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography>No teacher aides found</Typography>
            </Paper>
          )}
        </Box>
        <Box sx={{ width: 300, flexShrink: 0 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Unassigned Tasks</Typography>
          <UnassignedTaskList />
        </Box>
        <ConflictResolutionModal
          isOpen={isConflictModalOpen}
          onClose={() => setIsConflictModalOpen(false)}
        />
      </Box>
    </DndProvider>
  );
}

export default Schedule;
