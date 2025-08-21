import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useAbsences } from '../hooks/useAbsences';
import { absencesApi, aidesApi } from '../services';
import { TeacherAide } from '../types';
import { useAidesStore } from '../store';

function AideManagement() {
  const { aides, loading, error, setAides, setLoading, setError } = useAidesStore();
  const { absences, isLoading: absencesLoading, error: absencesError } = useAbsences();

  const [openAbsenceModal, setOpenAbsenceModal] = useState(false);
  const [openAddAideModal, setOpenAddAideModal] = useState(false);
  const [selectedAide, setSelectedAide] = useState<TeacherAide | null>(null);
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  const [notes, setNotes] = useState('');
  
  // New aide form state
  const [newAideName, setNewAideName] = useState('');
  const [newAideQualifications, setNewAideQualifications] = useState('');
  const [newAideEmail, setNewAideEmail] = useState('');
  const [newAideColor, setNewAideColor] = useState('#1976d2');

  useEffect(() => {
    // Load aides from API
    const fetchAides = async () => {
      try {
        setLoading(true);
        const response = await aidesApi.getAll();
        console.log('API Response:', response);
        // Handle the response properly - the API returns the data directly
        const aidesData = response.data || response;
        setAides(Array.isArray(aidesData) ? aidesData : []);
      } catch (error) {
        console.error('Failed to load aides:', error);
        setError('Failed to load teacher aides');
      } finally {
        setLoading(false);
      }
    };
    fetchAides();
  }, [setAides, setLoading, setError]);

  const handleOpenAbsenceModal = (aide: TeacherAide) => {
    setSelectedAide(aide);
    setOpenAbsenceModal(true);
  };

  const handleCloseAbsenceModal = () => {
    setOpenAbsenceModal(false);
    setSelectedAide(null);
    setStartDate(null);
    setEndDate(null);
    setNotes('');
  };

  const handleOpenAddAideModal = () => {
    setOpenAddAideModal(true);
  };

  const handleCloseAddAideModal = () => {
    setOpenAddAideModal(false);
    setNewAideName('');
    setNewAideQualifications('');
    setNewAideEmail('');
    setNewAideColor('#1976d2');
  };

  const handleSaveAbsence = async () => {
    if (selectedAide && startDate && endDate) {
      try {
        await absencesApi.create({
          aide_id: selectedAide.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          notes,
        });
        // TODO: Refresh absences after creation
        handleCloseAbsenceModal();
        window.location.reload(); // Temporary: Refresh the page to see new absence
        // In a real application, you would re-fetch absences using the useAbsences hook or Redux
      } catch (err) {
        console.error('Failed to create absence:', err);
        // TODO: Show error message to user
      }
    }
  };

  const handleAddAide = async () => {
    if (newAideName && newAideQualifications) {
      try {
        const response = await aidesApi.create({
          name: newAideName,
          qualifications: newAideQualifications,
          colour_hex: newAideColor,
          email: newAideEmail || undefined,
        });
        
        // Add the new aide to the store
        const newAide = response.data || response;
        setAides([...(aides || []), newAide]);
        handleCloseAddAideModal();
      } catch (err) {
        console.error('Failed to create aide:', err);
        setError('Failed to create teacher aide');
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Teacher Aide Management
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleOpenAddAideModal}
        >
          Add Teacher Aide
        </Button>
      </Box>
      
      <Typography variant="body1" mb={3}>Total Aides: {aides?.length || 0}</Typography>

      {/* Display Aides and Absences */}
      <Box sx={{ mt: 4 }}>
        {!aides || aides.length === 0 ? (
          <Typography variant="body1" color="text.secondary">
            No teacher aides found. Click "Add Teacher Aide" to create your first aide.
          </Typography>
        ) : (
          aides.map((aide: TeacherAide) => (
            <Box key={aide.id} sx={{ mb: 2, p: 2, border: '1px solid #ccc', borderRadius: '8px' }}>
              <Typography variant="h6">{aide.name}</Typography>
              <Typography variant="body2">Qualifications: {aide.qualifications}</Typography>
              {aide.email && (
                <Typography variant="body2">Email: {aide.email}</Typography>
              )}
              <Button variant="outlined" sx={{ mt: 1 }} onClick={() => handleOpenAbsenceModal(aide)}>
                Mark as Absent
              </Button>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1">Absences:</Typography>
                {absencesLoading ? (
                  <CircularProgress size={20} />
                ) : absencesError ? (
                  <Typography color="error">Error loading absences.</Typography>
                ) : (
                  absences.filter(abs => abs.aide_id === aide.id).length > 0 ? (
                    absences.filter(abs => abs.aide_id === aide.id).map(abs => (
                      <Typography key={abs.id} variant="body2">
                        {dayjs(abs.start_date).format('YYYY-MM-DD')} to {dayjs(abs.end_date).format('YYYY-MM-DD')} ({abs.notes})
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="body2">No absences recorded.</Typography>
                  )
                )}
              </Box>
            </Box>
          ))
        )}
      </Box>

      {/* Add Aide Modal */}
      <Dialog open={openAddAideModal} onClose={handleCloseAddAideModal} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Teacher Aide</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            value={newAideName}
            onChange={(e) => setNewAideName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
            required
          />
          <TextField
            label="Qualifications"
            fullWidth
            value={newAideQualifications}
            onChange={(e) => setNewAideQualifications(e.target.value)}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            label="Email (optional)"
            fullWidth
            type="email"
            value={newAideEmail}
            onChange={(e) => setNewAideEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Color"
            fullWidth
            type="color"
            value={newAideColor}
            onChange={(e) => setNewAideColor(e.target.value)}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddAideModal}>Cancel</Button>
          <Button 
            onClick={handleAddAide} 
            variant="contained"
            disabled={!newAideName || !newAideQualifications}
          >
            Add Aide
          </Button>
        </DialogActions>
      </Dialog>

      {/* Absence Modal */}
      <Dialog open={openAbsenceModal} onClose={handleCloseAbsenceModal}>
        <DialogTitle>Mark {selectedAide?.name} as Absent</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue ? dayjs(newValue) : null)}
              slotProps={{ textField: { fullWidth: true, sx: { mb: 2 } } }}
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue ? dayjs(newValue) : null)}
              slotProps={{ textField: { fullWidth: true, sx: { mb: 2 } } }}
            />
          </LocalizationProvider>
          <TextField
            label="Notes"
            multiline
            rows={4}
            fullWidth
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAbsenceModal}>Cancel</Button>
          <Button onClick={handleSaveAbsence} variant="contained">Save Absence</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AideManagement;
