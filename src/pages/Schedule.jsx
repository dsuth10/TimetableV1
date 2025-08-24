import { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress, 
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Button
} from '@mui/material';
import { ChevronLeft, ChevronRight, Today } from '@mui/icons-material';
import AideScheduleView from '../components/AideScheduleView';
import { assignmentsApi } from '../services/assignmentsApi';
import { aidesApi } from '../services/aidesApi';
import { absencesApi } from '../services/absencesApi';

// Helper function to get the Monday of the current week
const getCurrentWeekMonday = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek + 1);
  return monday;
};

// Helper function to format week range for display
const formatWeekRange = (weekStart) => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4); // Friday is 4 days after Monday
  
  return `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
};

// Helper: ISO week string (e.g., 2025-W34)
const getISOWeekString = (date) => {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  const year = tmp.getUTCFullYear();
  return `${year}-W${String(weekNo).padStart(2, '0')}`;
};

// Helper: Convert ISO week string (YYYY-Www) to local Monday Date
const weekStartFromISOWeek = (isoWeek) => {
  const match = /^(\d{4})-W(\d{2})$/.exec(isoWeek);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  // Thursday of week guarantees correct year
  const thursday = new Date(Date.UTC(year, 0, 4));
  const dayNum = thursday.getUTCDay() || 7;
  // Monday of week 1
  const mondayWeek1 = new Date(thursday);
  mondayWeek1.setUTCDate(thursday.getUTCDate() - dayNum + 1);
  // Target Monday
  const targetMondayUTC = new Date(mondayWeek1);
  targetMondayUTC.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
  // Convert to local Date with same Y-M-D
  return new Date(targetMondayUTC.getUTCFullYear(), targetMondayUTC.getUTCMonth(), targetMondayUTC.getUTCDate());
};

function Schedule() {
  const [aides, setAides] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedAideId, setSelectedAideId] = useState('');
  const [currentWeekStart, setCurrentWeekStart] = useState(getCurrentWeekMonday());

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const isoWeek = getISOWeekString(currentWeekStart);
      // Fetch week-scoped data in parallel
      const [aidesResponse, weeklyAssignmentsResponse, allAssignmentsResponse, absencesResponse] = await Promise.all([
        aidesApi.getAll(),
        assignmentsApi.getWeeklyMatrix(isoWeek),
        assignmentsApi.getAll(), // For unassigned tasks which may not be week-scoped
        absencesApi.getAll(isoWeek)
      ]);

      setAides(aidesResponse.data);
      // Combine weekly assigned with globally unassigned
      const weeklyAssigned = (weeklyAssignmentsResponse.data || []).filter(a => a.status === 'ASSIGNED');
      const globalUnassigned = (allAssignmentsResponse.data || []).filter(a => a.status === 'UNASSIGNED');
      setAssignments([...weeklyAssigned, ...globalUnassigned]);
      setAbsences(absencesResponse.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  // Set initial selected aide when aides are loaded
  useEffect(() => {
    if (aides.length > 0 && !selectedAideId) {
      setSelectedAideId(aides[0].id.toString());
    }
  }, [aides]); // Removed selectedAideId from dependencies to prevent infinite loop

  const handleAssignmentUpdate = async (assignment) => {
    setIsUpdating(true);
    try {
      await assignmentsApi.update(assignment.id, assignment);
      // Re-fetch assignments for the current week and unassigned
      const isoWeek = getISOWeekString(currentWeekStart);
      const [weeklyAssignmentsResponse, allAssignmentsResponse] = await Promise.all([
        assignmentsApi.getWeeklyMatrix(isoWeek),
        assignmentsApi.getAll()
      ]);
      const weeklyAssigned = (weeklyAssignmentsResponse.data || []).filter(a => a.status === 'ASSIGNED');
      const globalUnassigned = (allAssignmentsResponse.data || []).filter(a => a.status === 'UNASSIGNED');
      setAssignments([...weeklyAssigned, ...globalUnassigned]);
    } catch (err) {
      console.error('Failed to update assignment:', err);
      throw err; // Re-throw to let the component handle the error
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAideChange = (event) => {
    setSelectedAideId(event.target.value);
  };

  const changeWeek = (direction) => {
    const newWeek = new Date(currentWeekStart);
    newWeek.setDate(newWeek.getDate() + (direction * 7));
    setCurrentWeekStart(newWeek);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getCurrentWeekMonday());
  };

  // Initial load: read week from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const weekParam = params.get('week');
    if (weekParam) {
      const start = weekStartFromISOWeek(weekParam);
      if (start) {
        setCurrentWeekStart(start);
      }
    }
  }, []);

  // Fetch whenever week changes and keep URL synced
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('week', getISOWeekString(currentWeekStart));
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeekStart]);

  // Keyboard shortcuts for week navigation
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft') changeWeek(-1);
      if (e.key === 'ArrowRight') changeWeek(1);
      if (typeof e.key === 'string' && e.key.toLowerCase() === 't') goToCurrentWeek();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeekStart]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Error: {error}</Alert>
      </Box>
    );
  }

  // Separate assigned and unassigned tasks
  const assignedTasks = assignments.filter(a => a.status === 'ASSIGNED');
  const unassignedTasks = assignments.filter(a => a.status === 'UNASSIGNED');

  // Get the selected aide
  const selectedAide = aides.find(aide => aide.id.toString() === selectedAideId);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Teacher Aide Schedule
      </Typography>

      {/* Week Navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton aria-label="Previous week" onClick={() => changeWeek(-1)}>
          <ChevronLeft />
        </IconButton>
        <Typography variant="subtitle1" sx={{ minWidth: 260, textAlign: 'center' }}>
          Week of {formatWeekRange(currentWeekStart)}
        </Typography>
        <IconButton aria-label="Next week" onClick={() => changeWeek(1)}>
          <ChevronRight />
        </IconButton>
        <Button startIcon={<Today />} onClick={goToCurrentWeek}>
          Today
        </Button>
      </Box>

      {/* Aide Selection Dropdown */}
      <Box sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 300 }}>
          <InputLabel id="aide-select-label">Select Teacher Aide</InputLabel>
          <Select
            labelId="aide-select-label"
            id="aide-select"
            value={selectedAideId}
            label="Select Teacher Aide"
            onChange={handleAideChange}
          >
            {aides.map((aide) => (
              <MenuItem key={aide.id} value={aide.id.toString()}>
                {aide.name} - {aide.qualifications}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      {isUpdating && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Updating assignment...
        </Alert>
      )}

      {selectedAide ? (
        <AideScheduleView
          key={selectedAide.id}
          aide={selectedAide}
          allAssignments={assignedTasks}
          allUnassignedTasks={unassignedTasks}
          absences={absences.filter(abs => abs.aide_id === selectedAide.id)}
          isLoading={loading}
          onAssignmentUpdate={handleAssignmentUpdate}
          weekStartDate={currentWeekStart}
        />
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Please select a teacher aide to view their schedule</Typography>
        </Paper>
      )}
    </Box>
  );
}

export default Schedule;
