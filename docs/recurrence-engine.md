# Recurrence Engine Documentation

## Overview

The recurrence engine handles the automatic generation of assignment shells from recurring tasks using iCal RRULE format. It includes automatic horizon extension and task modification handling.

## Core Components

### 1. Recurrence Engine (`api/recurrence.py`)

**Key Functions:**
- `parse_rrule(rrule_str, start_date)` - Parse iCal RRULE strings
- `generate_assignments(task, start_date, end_date, session)` - Generate assignments for a task
- `extend_assignment_horizon(session, horizon_weeks)` - Extend horizon for all recurring tasks
- `update_future_assignments(task, session, ...)` - Update future assignments when task changes

**Features:**
- Configurable horizon (4 weeks default, up to 10 weeks max)
- Automatic duplicate prevention
- Expiration date handling
- Future assignment updates

### 2. Task Model Integration

**Methods:**
- `Task.generate_assignments(start_date, end_date, session)` - Generate assignments for this task
- `Task.update_future_assignments(session, ...)` - Update future assignments when task changes

**Automatic Integration:**
- Task updates automatically trigger future assignment regeneration
- Only affects future unstarted assignments
- Historical assignments remain unchanged

### 3. Scheduler System (`api/scheduler.py`)

**Features:**
- Automatic horizon extension every 24 hours
- Background thread processing
- Error handling and recovery
- Manual trigger capability

**Management:**
- Start/stop scheduler
- Status monitoring
- Manual horizon extension

## API Endpoints

### Horizon Extension
- `POST /api/assignments/extend-horizon` - Extend horizon for all recurring tasks
- `POST /api/scheduler/extend-horizon` - Manual horizon extension with custom weeks

### Scheduler Management
- `GET /api/scheduler/status` - Get scheduler status
- `POST /api/scheduler/control` - Start/stop scheduler

## Usage Examples

### Creating a Recurring Task
```json
POST /api/tasks
{
  "title": "Morning Playground Duty",
  "category": "PLAYGROUND",
  "start_time": "09:00",
  "end_time": "10:00",
  "recurrence_rule": "FREQ=WEEKLY;BYDAY=MO,WE,FR"
}
```

### Updating a Recurring Task
```json
PUT /api/tasks/{id}
{
  "start_time": "10:00",
  "end_time": "11:00"
}
```
**Response includes:** `"assignments_updated": 12` (number of future assignments updated)

### Manual Horizon Extension
```json
POST /api/scheduler/extend-horizon
{
  "horizon_weeks": 6
}
```

### Scheduler Control
```json
POST /api/scheduler/control
{
  "action": "start"  // or "stop", "status"
}
```

## RRULE Format Support

**Supported Patterns:**
- `FREQ=WEEKLY;BYDAY=MO,WE,FR` - Weekly on Monday, Wednesday, Friday
- `FREQ=DAILY;COUNT=5` - Daily for 5 occurrences
- `FREQ=WEEKLY;BYDAY=TU,TH` - Weekly on Tuesday, Thursday
- `FREQ=WEEKLY;BYDAY=MO` - Weekly on Monday only

**Weekday Codes:**
- `MO` - Monday
- `TU` - Tuesday
- `WE` - Wednesday
- `TH` - Thursday
- `FR` - Friday
- `SA` - Saturday
- `SU` - Sunday

## Configuration

**Default Settings:**
- Horizon: 4 weeks
- Maximum horizon: 10 weeks
- Scheduler interval: 24 hours
- Assignment status: UNASSIGNED

**Environment Variables:**
- `DEFAULT_HORIZON_WEEKS` - Default horizon extension
- `MAX_HORIZON_WEEKS` - Maximum allowed horizon

## Error Handling

**Common Issues:**
- Invalid RRULE format - Returns None from parse_rrule()
- Expired tasks - No assignments generated after expiration
- Database errors - Rollback and error response
- Scheduler errors - Logged and retry after 1 minute

## Testing

**Test Coverage:**
- RRULE parsing with valid/invalid patterns
- Assignment generation for various recurrence patterns
- Horizon extension with multiple tasks
- Future assignment updates on task modification
- Scheduler functionality and error handling
- Task update integration

**Running Tests:**
```bash
pytest tests/test_recurrence.py -v
```

## Performance Considerations

**Optimizations:**
- Duplicate assignment prevention
- Batch database operations
- Configurable horizon limits
- Background processing for scheduler

**Monitoring:**
- Scheduler status endpoint
- Assignment count tracking
- Error logging
- Performance metrics

## Future Enhancements

**Potential Improvements:**
- More complex RRULE patterns
- Custom recurrence rules
- Assignment conflict resolution
- Advanced scheduling algorithms
- Integration with external calendar systems
