import React, { useState } from 'react';
import { Box, Typography, TextField, Button, MenuItem, Snackbar, Alert, AlertColor } from '@mui/material';

const TeacherRequestForm = () => {
  const [requestType, setRequestType] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');

  const handleRequestSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!requestType || !description || !contactEmail) {
      setSnackbarMessage('Please fill in all required fields.');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
      return;
    }

    // In a real application, you would send this data to a backend API.
    console.log('Teacher Request Submitted:', { requestType, description, contactEmail });

    setSnackbarMessage('Request submitted successfully!');
    setSnackbarSeverity('success');
    setOpenSnackbar(true);

    // Clear form
    setRequestType('');
    setDescription('');
    setContactEmail('');
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Submit a Teacher Request
      </Typography>
      <Box component="form" onSubmit={handleRequestSubmit} sx={{ maxWidth: 500 }}>
        <TextField
          select
          label="Request Type"
          value={requestType}
          onChange={(e) => setRequestType(e.target.value)}
          fullWidth
          margin="normal"
          required
        >
          <MenuItem value="new_task">New Task Assignment</MenuItem>
          <MenuItem value="aide_availability">Aide Availability Inquiry</MenuItem>
          <MenuItem value="schedule_change">Schedule Change Request</MenuItem>
          <MenuItem value="other">Other</MenuItem>
        </TextField>
        <TextField
          label="Description"
          multiline
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Your Email"
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <Button type="submit" variant="contained" sx={{ mt: 2 }}>
          Submit Request
        </Button>
      </Box>
      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TeacherRequestForm;
