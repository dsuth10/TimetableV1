# Bug Report and Fixes

## Overview

I found and fixed 3 significant bugs in the codebase:

1. **Transaction Isolation Issue** - Premature commits breaking transaction boundaries
2. **Inconsistent Session Management** - Direct database session usage causing potential leaks
3. **Logic Error in Absence Deletion** - Improper automatic reassignment without availability checks

---

## Bug 1: Transaction Isolation Issue in `api/recurrence.py`

### **Issue Type**: Logic Error / Transaction Management

### **Severity**: High

### **Description**
The `update_future_assignments()` function contained a `session.commit()` call that violated transaction isolation principles. When this function was called within a larger transaction context (e.g., from the task update endpoint), it would commit changes prematurely, potentially causing:

- Partial commits if the parent transaction failed later
- Data inconsistency
- Inability to rollback the entire operation on error

### **Location**
- **File**: `api/recurrence.py`
- **Function**: `update_future_assignments()`
- **Line**: 130

### **Root Cause**
The function was designed to be self-contained with its own commit, but it's actually called from within larger transactions in the routes layer.

### **Fix Applied**
```python
# BEFORE (Problematic)
def update_future_assignments(task: Task, session, ...):
    # ... business logic ...
    session.commit()  # ❌ Breaks transaction isolation
    return len(new_assignments)

# AFTER (Fixed)
def update_future_assignments(task: Task, session, ...):
    # ... business logic ...
    # Note: Commit is now handled by the calling function
    # This maintains transaction isolation and allows for proper error handling
    return len(new_assignments)
```

### **Impact**
- **Before**: Risk of data corruption and inconsistent state
- **After**: Proper transaction boundaries maintained, allowing for atomic operations

---

## Bug 2: Inconsistent Session Management in `api/task.py`

### **Issue Type**: Performance Issue / Resource Management

### **Severity**: Medium-High

### **Description**
The `api/task.py` file was using direct `db.session` access instead of following the proper session management pattern used throughout the rest of the codebase. This pattern violation could lead to:

- Session leaks
- Inconsistent session lifecycle management
- Difficulty in testing with different database backends
- Poor error handling and cleanup

### **Location**
- **File**: `api/task.py`
- **Functions**: `post()` and `put()` methods
- **Lines**: Multiple locations using `db.session`

### **Root Cause**
The code was not following the established session management pattern that uses `get_db()` context manager for proper session lifecycle.

### **Fix Applied**
```python
# BEFORE (Problematic)
def post(self):
    data = request.get_json()
    # ... validation ...
    db.session.add(task)           # ❌ Direct session access
    db.session.flush()             # ❌ No proper error handling
    # ... more logic ...
    db.session.commit()            # ❌ No rollback on error

# AFTER (Fixed)
def post(self):
    session = next(get_db())       # ✅ Proper session management
    try:
        data = request.get_json()
        # ... validation ...
        session.add(task)          # ✅ Consistent pattern
        session.flush()
        # ... more logic ...
        session.commit()
        return result, 201
    except Exception as e:
        session.rollback()          # ✅ Proper error handling
        return error_response('INTERNAL_ERROR', str(e), 500)
```

### **Additional Changes**
- Added proper imports for all dependencies
- Standardized error handling with try/catch blocks
- Used consistent session management pattern
- Added proper error responses

### **Impact**
- **Before**: Potential session leaks and inconsistent error handling
- **After**: Consistent session management, proper cleanup, and robust error handling

---

## Bug 3: Logic Error in Absence Deletion with Improper Reassignment

### **Issue Type**: Logic Error / Business Logic

### **Severity**: High

### **Description**
In the absence deletion functionality, when an absence record was deleted, the system would automatically reassign all affected assignments back to the original aide without checking if the aide was actually available during those time slots. The original logic only checked if the task had a classroom with capacity, which is completely unrelated to aide availability.

### **Location**
- **File**: `api/absence.py`
- **Class**: `AbsenceResource`
- **Method**: `delete()`
- **Lines**: ~160-175

### **Root Cause**
The reassignment logic was using an irrelevant condition (`assignment.task.classroom.capacity`) instead of checking the aide's actual availability schedule.

### **Fix Applied**
```python
# BEFORE (Problematic Logic)
for assignment in affected_assignments:
    # Check if original aide is available
    if assignment.task.classroom and assignment.task.classroom.capacity:  # ❌ Wrong condition!
        assignment.aide_id = aide_id
        assignment.status = Status.ASSIGNED
        reassigned_ids.append(assignment.id)

# AFTER (Fixed Logic)
for assignment in affected_assignments:
    # Check if the aide has availability for this assignment
    assignment_weekday = assignment.date.weekday()
    
    # Check if aide has availability on this weekday and time
    aide_availability = db.query(Availability).filter(
        Availability.aide_id == aide_id,
        Availability.weekday == assignment_weekday,
        Availability.start_time <= assignment.start_time,
        Availability.end_time >= assignment.end_time
    ).first()
    
    # Only reassign if aide has proper availability  ✅ Correct logic!
    if aide_availability:
        assignment.aide_id = aide_id
        assignment.status = Status.ASSIGNED
        reassigned_ids.append(assignment.id)
    # Otherwise, leave assignment unassigned for manual reassignment
```

### **Additional Improvements**
- Created a copy of assignments list before deletion to avoid iteration issues
- Added proper availability checking based on weekday and time slots
- Enhanced response to include total affected assignments count
- Assignments without proper availability remain unassigned for manual review

### **Impact**
- **Before**: Incorrect automatic reassignments leading to scheduling conflicts
- **After**: Only valid reassignments based on actual aide availability, preventing conflicts

---

## Summary

These fixes address critical issues in:

1. **Data Integrity**: Transaction boundaries now properly maintained
2. **Resource Management**: Consistent session handling prevents leaks
3. **Business Logic**: Proper availability checking prevents scheduling conflicts

All fixes maintain backward compatibility while significantly improving the robustness and reliability of the application.

## Testing Recommendations

1. **Transaction Testing**: Verify that partial failures properly rollback all changes
2. **Session Management**: Test with multiple concurrent requests to ensure no session leaks
3. **Absence Management**: Test absence deletion with various availability scenarios

## Files Modified

- `api/recurrence.py` - Removed premature commit
- `api/task.py` - Implemented proper session management and error handling
- `api/absence.py` - Fixed reassignment logic with proper availability checking