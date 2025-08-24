import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { Assignment } from '../types/assignment';

interface DurationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (assignment: Assignment, duration: number) => void;
  assignment: Assignment | null;
  dropTime: string;
  dropDay: string;
  dropAideId: number;
}

const DurationModal: React.FC<DurationModalProps> = ({
  open,
  onClose,
  onConfirm,
  assignment,
  dropTime,
  dropDay,
  dropAideId,
}) => {
  const [duration, setDuration] = useState(0.5); // Default 30 minutes

  if (!assignment) return null;

  const handleConfirm = () => {
    // Calculate end time based on duration
    const [hours, minutes] = dropTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + (duration * 60);
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    // Create updated assignment with calculated times
    const updatedAssignment: Assignment = {
      ...assignment,
      aide_id: dropAideId,
      start_time: dropTime,
      end_time: endTime,
      status: 'ASSIGNED',
    };

    onConfirm(updatedAssignment, duration);
    onClose();
  };

  const durationOptions = [
    { value: 0.25, label: '15 minutes' },
    { value: 0.5, label: '30 minutes' },
    { value: 0.75, label: '45 minutes' },
    { value: 1, label: '1 hour' },
    { value: 1.25, label: '1 hour 15 minutes' },
    { value: 1.5, label: '1 hour 30 minutes' },
    { value: 1.75, label: '1 hour 45 minutes' },
    { value: 2, label: '2 hours' },
    { value: 2.5, label: '2 hours 30 minutes' },
    { value: 3, label: '3 hours' },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Set Task Duration
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {assignment.task_title}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {assignment.task_category}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Chip 
              label={`${dropDay} at ${dropTime}`} 
              color="primary" 
              variant="outlined"
              sx={{ mr: 1 }}
            />
            <Chip 
              label="Flexible Task" 
              color="secondary" 
              variant="outlined"
            />
          </Box>
        </Box>

        <FormControl fullWidth>
          <InputLabel>Duration</InputLabel>
          <Select
            value={duration}
            label="Duration"
            onChange={(e) => setDuration(e.target.value as number)}
          >
            {durationOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Preview:</strong> This task will occupy time slots from{' '}
            <strong>{dropTime}</strong> to{' '}
            <strong>
              {(() => {
                const [hours, minutes] = dropTime.split(':').map(Number);
                const startMinutes = hours * 60 + minutes;
                const endMinutes = startMinutes + (duration * 60);
                const endHours = Math.floor(endMinutes / 60);
                const endMins = endMinutes % 60;
                return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
              })()}
            </strong>
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" color="primary">
          Confirm Assignment
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DurationModal;
