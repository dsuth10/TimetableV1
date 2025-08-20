# Weekly Matrix Endpoint Documentation

## Overview

The weekly matrix endpoint (`GET /api/assignments/weekly-matrix`) provides a structured view of assignments organized by day and time slots for each teacher aide. This endpoint is specifically designed for the frontend timetable grid component.

## Endpoint

```
GET /api/assignments/weekly-matrix?week=YYYY-WW
```

## Parameters

- `week` (required): Week in ISO format (YYYY-WW), e.g., "2024-W01"

## Response Structure

```json
{
  "week": "2024-W01",
  "start_date": "2024-01-01",
  "end_date": "2024-01-07",
  "time_slots": ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30"],
  "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "aides": [
    {
      "id": 1,
      "name": "John Smith",
      "colour_hex": "#FF0000",
      "qualifications": "Special Education"
    }
  ],
  "assignments": {
    "1_Monday_09:00": {
      "assignment_id": 123,
      "task_id": 456,
      "task_title": "Morning Playground Duty",
      "task_category": "PLAYGROUND",
      "start_time": "09:00",
      "end_time": "10:00",
      "status": "ASSIGNED",
      "classroom": "Room 101",
      "school_class": "Grade 3A",
      "notes": "Supervise morning recess"
    }
  },
  "absences": {
    "1_Monday": {
      "absence_id": 789,
      "reason": "Sick leave",
      "date": "2024-01-01"
    }
  }
}
```

## Data Structure Details

### Time Slots
- 30-minute intervals from 08:00 to 16:00 (16 slots total)
- Format: "HH:MM"

### Days
- Monday through Friday only (weekends excluded)
- Full day names: "Monday", "Tuesday", etc.

### Aides
- List of all teacher aides with their basic information
- Ordered alphabetically by name

### Assignments
- Key format: `{aide_id}_{day}_{time_slot}`
- Example: `"1_Monday_09:00"` for aide ID 1, Monday, 9:00 AM slot
- Only includes assignments that overlap with the time slot
- Contains full task details for display

### Absences
- Key format: `{aide_id}_{day}`
- Example: `"1_Monday"` for aide ID 1 on Monday
- Covers the entire day

## Usage Examples

### Frontend Integration

```javascript
// Fetch weekly matrix data
const response = await fetch('/api/assignments/weekly-matrix?week=2024-W01');
const matrix = await response.json();

// Access assignment for specific aide, day, and time
const assignmentKey = `${aideId}_${day}_${timeSlot}`;
const assignment = matrix.assignments[assignmentKey];

// Check if aide is absent on a specific day
const absenceKey = `${aideId}_${day}`;
const absence = matrix.absences[absenceKey];
```

### Error Handling

```javascript
if (response.status === 422) {
  // Invalid week format
  console.error('Invalid week format. Use YYYY-WW');
} else if (response.status === 500) {
  // Server error
  console.error('Server error occurred');
}
```

## Performance Considerations

- The endpoint uses eager loading to minimize database queries
- Time slot calculation is done in memory for efficiency
- Week validation prevents invalid date ranges
- Response size is optimized for frontend consumption

## Testing

The endpoint includes comprehensive tests covering:
- Valid week formats
- Invalid week formats
- Assignment data structure
- Absence data structure
- Time slot calculations
- Error handling

## Implementation Notes

- Weekends are excluded from the response
- Only assigned tasks (with aide_id) are included in assignments
- Time slots are calculated based on assignment start/end times
- Absences apply to entire days
- All times are in 24-hour format
