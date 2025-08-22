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
  MenuItem
} from '@mui/material';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import AideScheduleView from '../components/AideScheduleView';
import { assignmentsApi } from '../services/assignmentsApi';
import { aidesApi } from '../services/aidesApi';
import { absencesApi } from '../services/absencesApi';

function Schedule() {
  const [aides, setAides] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedAideId, setSelectedAideId] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [aidesResponse, assignmentsResponse, absencesResponse] = await Promise.all([
        aidesApi.getAll(),
        assignmentsApi.getAll(),
        absencesApi.getAll()
      ]);

      setAides(aidesResponse.data);
      setAssignments(assignmentsResponse.data);
      setAbsences(absencesResponse.data);
      
      // Set the first aide as selected by default
      if (aidesResponse.data.length > 0 && !selectedAideId) {
        setSelectedAideId(aidesResponse.data[0].id.toString());
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentUpdate = async (assignment) => {
    setIsUpdating(true);
    try {
      await assignmentsApi.update(assignment.id, assignment);
      // Re-fetch assignments to get updated data
      const response = await assignmentsApi.getAll();
      setAssignments(response.data);
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

  useEffect(() => {
    fetchData();
  }, []);

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
    <DndProvider backend={HTML5Backend}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Teacher Aide Schedule
        </Typography>

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
          />
        ) : (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography>Please select a teacher aide to view their schedule</Typography>
          </Paper>
        )}
      </Box>
    </DndProvider>
  );
}

export default Schedule;
