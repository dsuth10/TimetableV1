import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { fetchAides } from '../store/slices/aidesSlice';
import { useAbsences } from '../hooks/useAbsences';
import { absenceAPI } from '../services/api';
import { TeacherAide } from '../types';
import { AppDispatch, RootState } from '../store';

function AideManagement() {
  const dispatch = useDispatch<AppDispatch>();
  const { items: aides, status, error } = useSelector((state: RootState) => state.aides);
  const { absences, isLoading: absencesLoading, error: absencesError } = useAbsences();

  const [openAbsenceModal, setOpenAbsenceModal] = useState(false);
  const [selectedAide, setSelectedAide] = useState<TeacherAide | null>(null);
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchAides());
    }
  }, [status, dispatch]);

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

  const handleSaveAbsence = async () => {
    if (selectedAide && startDate && endDate) {
      try {
        await absenceAPI.create({
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

  if (status === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'failed') {
    return (
      <Box>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Teacher Aide Management
      </Typography>
      <Typography>Total Aides: {aides.length}</Typography>

      {/* Display Aides and Absences */}
      <Box sx={{ mt: 4 }}>
        {aides.map((aide) => (
          <Box key={aide.id} sx={{ mb: 2, p: 2, border: '1px solid #ccc', borderRadius: '8px' }}>
            <Typography variant="h6">{aide.name}</Typography>
            <Typography variant="body2">Qualifications: {aide.qualifications}</Typography>
            <Typography variant="body2">Email: {aide.email}</Typography>
            <Button variant="outlined" sx={{ mt: 1 }} onClick={() => handleOpenAbsenceModal(aide as TeacherAide)}>
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
        ))}
      </Box>

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
