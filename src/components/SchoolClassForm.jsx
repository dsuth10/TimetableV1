import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import api from '../services/api';

function SchoolClassForm({ onClassAdded }) {
  const [formData, setFormData] = useState({
    class_code: '',
    grade: '',
    teacher: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState(null);
  const [error, setError] = useState(null);

  const grades = ['Kindergarten', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null); // Clear error on change
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponseMessage(null);
    setError(null);

    // Basic validation
    if (!formData.class_code || !formData.grade || !formData.teacher) {
      setError("Class Code, Grade, and Teacher are required fields.");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/school-classes', formData);
      setResponseMessage(`Class "${response.data.class_code}" added successfully!`);
      setFormData({ // Clear form
        class_code: '',
        grade: '',
        teacher: '',
        notes: ''
      });
      if (onClassAdded) {
        onClassAdded(response.data);
      }
    } catch (err) {
      console.error("Error adding class:", err);
      setError(err.response?.data?.message || err.response?.data?.error?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 4, p: 3, border: '1px solid #ccc', borderRadius: '8px' }}>
      <Typography variant="h5" gutterBottom>Add New Class</Typography>
      {responseMessage && <Alert severity="success" sx={{ mb: 2 }}>{responseMessage}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TextField
        required
        label="Class Code"
        name="class_code"
        value={formData.class_code}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <FormControl fullWidth margin="normal" required>
        <InputLabel id="grade-select-label">Grade</InputLabel>
        <Select
          labelId="grade-select-label"
          id="grade-select"
          name="grade"
          value={formData.grade}
          label="Grade"
          onChange={handleChange}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {grades.map((g) => (
            <MenuItem key={g} value={g}>{g}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        required
        label="Teacher"
        name="teacher"
        value={formData.teacher}
        onChange={handleChange}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Notes"
        name="notes"
        value={formData.notes}
        onChange={handleChange}
        fullWidth
        multiline
        rows={3}
        margin="normal"
      />

      <Button
        type="submit"
        variant="contained"
        color="primary"
        sx={{ mt: 2 }}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : 'Add Class'}
      </Button>
    </Box>
  );
}

export default SchoolClassForm;
