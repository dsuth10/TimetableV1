import React from 'react';
import dayjs from 'dayjs';
import {
  Box,
  FormControlLabel,
  Switch,
  FormControl,
  FormGroup,
  FormLabel,
  Typography,
  Paper,
  FormHelperText,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

const WEEKDAYS = [
  { value: 'MON', label: 'Monday' },
  { value: 'TUE', label: 'Tuesday' },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday' },
  { value: 'FRI', label: 'Friday' },
];

const RecurrenceOptions = ({ value, onChange, error }) => {
  const { isRecurring, selectedDays, expiresOn } = value;

  const handleRecurringToggle = (event) => {
    onChange({
      ...value,
      isRecurring: event.target.checked,
      selectedDays: event.target.checked ? selectedDays : [],
    });
  };

  const handleDayToggle = (day) => (event) => {
    const newSelectedDays = event.target.checked
      ? [...selectedDays, day]
      : selectedDays.filter((d) => d !== day);

    onChange({
      ...value,
      selectedDays: newSelectedDays,
    });
  };

  const handleExpiryChange = (newValue) => {
    onChange({
      ...value,
      expiresOn: newValue,
    });
  };

  return (
    <Box sx={{ mt: 2 }}>
      <FormControlLabel
        control={
          <Switch
            checked={isRecurring}
            onChange={handleRecurringToggle}
            color="primary"
          />
        }
        label="Recurring Task"
      />

      {isRecurring && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <FormControl component="fieldset" sx={{ width: '100%' }} error={!!error}>
            <FormLabel component="legend">Repeat on</FormLabel>
            <FormGroup row>
              {WEEKDAYS.map((day) => (
                <FormControlLabel
                  key={day.value}
                  control={
                    <Switch
                      checked={selectedDays.includes(day.value)}
                      onChange={handleDayToggle(day.value)}
                      color="primary"
                    />
                  }
                  label={day.label}
                />
              ))}
            </FormGroup>
            {error && <FormHelperText>{error}</FormHelperText>}
          </FormControl>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              End Date (Optional)
            </Typography>
            <DatePicker
              value={expiresOn}
              onChange={handleExpiryChange}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default RecurrenceOptions;
