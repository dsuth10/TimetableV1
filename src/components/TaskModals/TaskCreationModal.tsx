import React, { useState, useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';
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
  SelectChangeEvent, // Import SelectChangeEvent
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { PickerChangeHandlerContext, TimeValidationError } from '@mui/x-date-pickers/models'; // Import PickerChangeHandlerContext and TimeValidationError
import RecurrenceOptions from './RecurrenceOptions';
import { validateTaskForm } from './validation';
import { createTask, getSchoolClasses, previewRecurringTask } from '../../services/taskService'; // Import previewRecurringTask
import { addTask } from '../../store/slices/tasksSlice';
import { Task } from '../../types/task'; // Import Task type

interface TaskCreationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (result: any) => void; // Adjust 'any' to a more specific type if available
}

interface SchoolClass {
  id: number;
  class_code: string;
  teacher: string;
}

interface TaskFormData {
  title: string;
  category: string;
  startTime: Dayjs | null;
  endTime: Dayjs | null;
  schoolClassId: number | '';
  notes: string;
  isRecurring: boolean;
  selectedDays: string[];
  expiresOn: Dayjs | null;
}

interface TaskFormErrors {
  title?: string;
  category?: string;
  startTime?: string;
  endTime?: string;
  selectedDays?: string;
}

const TaskCreationModal: React.FC<TaskCreationModalProps> = ({ open, onClose, onSubmit }) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    category: '',
    startTime: null,
    endTime: null,
    schoolClassId: '',
    notes: '',
    isRecurring: false,
    selectedDays: [],
    expiresOn: null,
  });

  const [errors, setErrors] = useState<TaskFormErrors>({});
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null); // Re-add previewData
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const schoolClassData = await getSchoolClasses(); // Fetch school classes
        setSchoolClasses(Array.isArray(schoolClassData) ? schoolClassData : []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setApiError('Failed to load data (school classes)');
        setSchoolClasses([]);
      }
    };

  if (open) {
    fetchData();
  }
}, [open]);

  const handleChange = (field: keyof TaskFormData) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string | number>) => {
    setFormData({
      ...formData,
      [field]: event.target.value as any, // Cast to any to handle mixed types (string | number)
    });
    // Clear error when field is modified
    if (errors[field as keyof TaskFormErrors]) {
      setErrors({ ...errors, [field as keyof TaskFormErrors]: undefined });
    }
  };

  const handleTimeChange = (field: 'startTime' | 'endTime') => (newValue: any, context: PickerChangeHandlerContext<TimeValidationError>) => {
    setFormData({
      ...formData,
      [field]: newValue as Dayjs | null, // Explicitly cast newValue to Dayjs | null
    });
    // Clear error when field is modified
    if (errors[field as keyof TaskFormErrors]) {
      setErrors({ ...errors, [field as keyof TaskFormErrors]: undefined });
    }
  };

  const handleRecurrenceChange = (newValue: {isRecurring: boolean, selectedDays: string[], expiresOn: Dayjs | null}) => {
    setFormData({
      ...formData,
      ...newValue,
    });
    // Clear error when field is modified
    if (errors.selectedDays) {
      setErrors({ ...errors, selectedDays: undefined });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
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
        start_time: formData.startTime ? formData.startTime.format('HH:mm') : '',
        end_time: formData.endTime ? formData.endTime.format('HH:mm') : '',
        school_class_id: formData.schoolClassId || null,
        notes: formData.notes || null,
        recurrence_rule: formData.isRecurring ? `FREQ=WEEKLY;BYDAY=${formData.selectedDays.join(',')}` : null,
        expires_on: formData.isRecurring && formData.expiresOn ? formData.expiresOn.format('YYYY-MM-DD') : null,
      };

      const result = await createTask(apiData); // Always call createTask
      // The API returns the created task directly, so dispatch that object
      dispatch(addTask(result));
      onSubmit(result);
      onClose();
    } catch (error: any) {
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
        start_time: formData.startTime ? formData.startTime.format('HH:mm') : null,
        end_time: formData.endTime ? formData.endTime.format('HH:mm') : null,
        recurrence_rule: {
          days: formData.selectedDays,
          expires_on: formData.expiresOn ? formData.expiresOn.format('YYYY-MM-DD') : null,
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

            {/* New School Class Dropdown */}
            <FormControl fullWidth>
              <InputLabel>School Class</InputLabel>
              <Select
                value={formData.schoolClassId as number | string}
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
            onClick={() => console.log('Create Task button clicked!')}
          >
            {loading ? <CircularProgress size={24} /> : 'Create Task'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TaskCreationModal;
