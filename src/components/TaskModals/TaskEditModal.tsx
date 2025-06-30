import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
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
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'; // Use AdapterDayjs
import RecurrenceOptions from './RecurrenceOptions';
import { validateTaskForm } from './validation';
import { updateTask, getClassrooms, getSchoolClasses, previewRecurringTask } from '../../services/taskService'; // Added getSchoolClasses

const TaskEditModal = ({ open, onClose, onSubmit, task }) => {
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

  useEffect(() => {
    if (task) {
      let isRecurring = false;
      let selectedDays = [];
      let expiresOn = null;

      if (task.recurrence_rule) {
        isRecurring = true;
        const bydayMatch = task.recurrence_rule.match(/BYDAY=([^;]+)/);
        if (bydayMatch && bydayMatch[1]) {
          selectedDays = bydayMatch[1].split(',');
        }
        const untilMatch = task.recurrence_rule.match(/UNTIL=([^;]+)/); // Assuming UNTIL for expires_on
        if (untilMatch && untilMatch[1]) {
          // Parse UNTIL date (e.g., 20250630T235959Z)
          const dateStr = untilMatch[1].substring(0, 4) + '-' + untilMatch[1].substring(4, 6) + '-' + untilMatch[1].substring(6, 8);
          expiresOn = dayjs(dateStr);
        } else if (task.expires_on) { // Fallback to expires_on if UNTIL not in rule
          expiresOn = dayjs(task.expires_on);
        }
      }

      setFormData({
        title: task.title || '',
        category: task.category || '',
        startTime: task.start_time ? dayjs(`2000-01-01T${task.start_time}`) : null,
        endTime: task.end_time ? dayjs(`2000-01-01T${task.end_time}`) : null,
        classroomId: task.classroom_id || '',
        schoolClassId: task.school_class_id || '', // Include school_class_id
        notes: task.notes || '',
        isRecurring: isRecurring,
        selectedDays: selectedDays,
        expiresOn: expiresOn,
      });
    }
  }, [task]);

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
        start_time: formData.startTime ? formData.startTime.format('HH:mm') : null,
        end_time: formData.endTime ? formData.endTime.format('HH:mm') : null,
        classroom_id: formData.classroomId || null,
        school_class_id: formData.schoolClassId || null, // Include school_class_id
        notes: formData.notes || null,
        recurrence_rule: formData.isRecurring ? `FREQ=WEEKLY;BYDAY=${formData.selectedDays.join(',')}${formData.expiresOn ? `;UNTIL=${formData.expiresOn.format('YYYYMMDD')}T235959Z` : ''}` : null,
        expires_on: formData.isRecurring && formData.expiresOn ? formData.expiresOn.format('YYYY-MM-DD') : null,
      };

      const result = await updateTask(task.id, apiData);
      onSubmit(result);
      onClose();
    } catch (error) {
      setApiError(error.response?.data?.message || 'Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!formData.isRecurring) return;

    try {
      const apiData = {
        ...formData,
        start_time: formData.startTime ? formData.startTime.format('HH:mm') : null,
        end_time: formData.endTime ? formData.endTime.format('HH:mm') : null,
        recurrence_rule: `FREQ=WEEKLY;BYDAY=${formData.selectedDays.join(',')}${formData.expiresOn ? `;UNTIL=${formData.expiresOn.format('YYYYMMDD')}T235959Z` : ''}`,
      };

      const preview = await previewRecurringTask(apiData);
      setPreviewData(preview);
    } catch (error) {
      setApiError('Failed to generate preview');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Task</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {apiError && (
              <Alert severity="error" onClose={() => setApiError(null)}>
                {apiError}
              </Alert>
            )}

            {task?.recurrence_rule && (
              <Alert severity="warning">
                Editing this task will affect all future occurrences. Consider creating a new task instead.
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

            <LocalizationProvider dateAdapter={AdapterDayjs}>
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
            </LocalizationProvider>

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

            {formData.isRecurring && (
              <Button
                variant="outlined"
                onClick={handlePreview}
                disabled={loading}
                sx={{ mt: 1 }}
              >
                Preview Recurring Schedule
              </Button>
            )}

            {previewData && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Preview of Next 4 Weeks:
                </Typography>
                {previewData.occurrences.map((occurrence, index) => (
                  <Typography key={index} variant="body2">
                    {new Date(occurrence.date).toLocaleDateString()} - {occurrence.start_time} to {occurrence.end_time}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TaskEditModal;
