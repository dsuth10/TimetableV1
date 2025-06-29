import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import RecurrenceOptions from './RecurrenceOptions';
import { validateTaskForm } from './validation';
import { createTask, getClassrooms, getSchoolClasses, previewRecurringTask } from '../../services/taskService'; // Import getSchoolClasses
import { addTask } from '../../store/slices/tasksSlice';

const TaskCreationModal = ({ open, onClose, onSubmit }) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    startTime: null,
    endTime: null,
    classroomId: '',
    schoolClassId: '', // New state for school_class_id
    notes: '',
    isRecurring: false,
    selectedDays: [],
    expiresOn: null,
  });

  const [errors, setErrors] = useState({});
  const [classrooms, setClassrooms] = useState([]);
  const [schoolClasses, setSchoolClasses] = useState([]); // New state for school classes
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const classroomData = await getClassrooms();
        setClassrooms(Array.isArray(classroomData) ? classroomData : []);

        const schoolClassData = await getSchoolClasses(); // Fetch school classes
        setSchoolClasses(Array.isArray(schoolClassData) ? schoolClassData : []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setApiError('Failed to load data (classrooms or school classes)');
        setClassrooms([]);
        setSchoolClasses([]);
      }
    };

    if (open) {
      fetchData();
    }
  }, [open]);

  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
    // Clear error when field is modified
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const handleTimeChange = (field) => (newValue) => {
    setFormData({
      ...formData,
      [field]: newValue,
    });
    // Clear error when field is modified
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const handleRecurrenceChange = (newValue) => {
    setFormData({
      ...formData,
      ...newValue,
    });
    // Clear error when field is modified
    if (errors.selectedDays) {
      setErrors({ ...errors, selectedDays: null });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setApiError(null);
    
    // Validate form
    const validationErrors = validateTaskForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      // Format the data for the API
      const apiData = {
        title: formData.title,
        category: formData.category,
        start_time: formData.startTime ? formData.startTime.toLocaleTimeString('en-US', { hour12: false }) : null,
        end_time: formData.endTime ? formData.endTime.toLocaleTimeString('en-US', { hour12: false }) : null,
        classroom_id: formData.classroomId || null,
        school_class_id: formData.schoolClassId || null, // Include school_class_id
        notes: formData.notes || null,
        recurrence_rule: formData.isRecurring ? `FREQ=WEEKLY;BYDAY=${formData.selectedDays.join(',')}` : null,
        expires_on: formData.isRecurring && formData.expiresOn ? formData.expiresOn.toISOString().split('T')[0] : null,
      };

      const result = await createTask(apiData);
      dispatch(addTask(result.task));  // Add the new task to the store
      onSubmit(result);
      onClose();
    } catch (error) {
      setApiError(error.response?.data?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!formData.isRecurring) return;

    try {
      const apiData = {
        ...formData,
        start_time: formData.startTime ? formData.startTime.toLocaleTimeString('en-US', { hour12: false }) : null,
        end_time: formData.endTime ? formData.endTime.toLocaleTimeString('en-US', { hour12: false }) : null,
        recurrence_rule: {
          days: formData.selectedDays,
          expires_on: formData.expiresOn ? formData.expiresOn.toISOString().split('T')[0] : null,
        },
      };

      const preview = await previewRecurringTask(apiData);
      setPreviewData(preview);
    } catch (error) {
      setApiError('Failed to generate preview');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Task</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {apiError && (
              <Alert severity="error" onClose={() => setApiError(null)}>
                {apiError}
              </Alert>
            )}

            <TextField
              required
              label="Task Title"
              value={formData.title}
              onChange={handleChange('title')}
              error={!!errors.title}
              helperText={errors.title}
              fullWidth
            />

            <FormControl fullWidth required error={!!errors.category}>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={handleChange('category')}
                label="Category"
              >
                <MenuItem value="PLAYGROUND">Playground</MenuItem>
                <MenuItem value="CLASS_SUPPORT">Class Support</MenuItem>
                <MenuItem value="GROUP_SUPPORT">Group Support</MenuItem>
                <MenuItem value="INDIVIDUAL_SUPPORT">Individual Support</MenuItem>
              </Select>
              {errors.category && (
                <Typography color="error" variant="caption">
                  {errors.category}
                </Typography>
              )}
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TimePicker
                label="Start Time"
                value={formData.startTime}
                onChange={handleTimeChange('startTime')}
                sx={{ flex: 1 }}
                slotProps={{
                  textField: {
                    error: !!errors.startTime,
                    helperText: errors.startTime,
                  },
                }}
              />
              <TimePicker
                label="End Time"
                value={formData.endTime}
                onChange={handleTimeChange('endTime')}
                sx={{ flex: 1 }}
                slotProps={{
                  textField: {
                    error: !!errors.endTime,
                    helperText: errors.endTime,
                  },
                }}
              />
            </Box>

            <FormControl fullWidth>
              <InputLabel>Classroom</InputLabel>
              <Select
                value={formData.classroomId}
                onChange={handleChange('classroomId')}
                label="Classroom"
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {classrooms.map((classroom) => (
                  <MenuItem key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* New School Class Dropdown */}
            <FormControl fullWidth>
              <InputLabel>School Class</InputLabel>
              <Select
                value={formData.schoolClassId}
                onChange={handleChange('schoolClassId')}
                label="School Class"
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {schoolClasses.map((schoolClass) => (
                  <MenuItem key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.class_code} ({schoolClass.teacher})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Notes"
              value={formData.notes}
              onChange={handleChange('notes')}
              multiline
              rows={3}
              fullWidth
            />

            <RecurrenceOptions
              value={{
                isRecurring: formData.isRecurring,
                selectedDays: formData.selectedDays,
                expiresOn: formData.expiresOn,
              }}
              onChange={handleRecurrenceChange}
              error={errors.selectedDays}
            />

            {formData.isRecurring && previewData && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Preview:</Typography>
                <Typography variant="body2">
                  {previewData.occurrences} occurrences from {previewData.start_date} to {previewData.end_date}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          {formData.isRecurring && (
            <Button onClick={handlePreview} disabled={loading}>
              Preview
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Create Task'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TaskCreationModal;
