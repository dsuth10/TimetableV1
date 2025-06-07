/**
 * Validates task form data and returns any validation errors.
 * @param {Object} data - The form data to validate
 * @returns {Object} Object containing any validation errors
 */
export const validateTaskForm = (data) => {
  const errors = {};

  // Required fields
  if (!data.title?.trim()) {
    errors.title = 'Title is required';
  }

  if (!data.category) {
    errors.category = 'Category is required';
  }

  if (!data.startTime) {
    errors.startTime = 'Start time is required';
  }

  if (!data.endTime) {
    errors.endTime = 'End time is required';
  }

  // Time validation
  if (data.startTime && data.endTime) {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    
    if (end <= start) {
      errors.endTime = 'End time must be after start time';
    }

    // Check if within school hours (8:00 AM to 4:00 PM)
    const schoolStart = new Date(data.startTime);
    schoolStart.setHours(8, 0, 0);
    
    const schoolEnd = new Date(data.startTime);
    schoolEnd.setHours(16, 0, 0);

    if (start < schoolStart) {
      errors.startTime = 'Start time must be after 8:00 AM';
    }
    if (end > schoolEnd) {
      errors.endTime = 'End time must be before 4:00 PM';
    }
  }

  // Recurrence validation
  if (data.isRecurring) {
    if (!data.selectedDays?.length) {
      errors.selectedDays = 'Select at least one day for recurring tasks';
    }

    if (data.expiresOn) {
      const expiryDate = new Date(data.expiresOn);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (expiryDate < today) {
        errors.expiresOn = 'End date must be in the future';
      }
    }
  }

  return errors;
}; 