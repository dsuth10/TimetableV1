import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Typography } from '@mui/material';
import { fetchTimetableData } from '../store/slices/timetableSlice';
import AideTimetable from '../components/AideTimetable';
import UnassignedTasks from '../components/UnassignedTasks';

function Schedule() {
  const dispatch = useDispatch();
  const { aides, assignments, absences, loading, error } = useSelector(state => state.timetable);

  // Placeholder: filter unassigned tasks from assignments
  const unassignedTasks = assignments
    ? assignments.filter(a => a.status === 'UNASSIGNED').map(a => ({
        id: a.id,
        title: a.task,
        duration: `${a.startTime} - ${a.endTime}`,
        color: a.categoryColor || '#3b82f6',
      }))
    : [];

  useEffect(() => {
    dispatch(fetchTimetableData());
  }, [dispatch]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
      <Box sx={{ flex: 1 }}>
        {aides && aides.map(aide => (
          <AideTimetable
            key={aide.id}
            aide={aide}
            assignments={assignments.filter(a => a.aideId === aide.id)}
            absences={absences.filter(abs => abs.aideId === aide.id)}
          />
        ))}
      </Box>
      <UnassignedTasks tasks={unassignedTasks} />
    </Box>
  );
}

export default Schedule; 