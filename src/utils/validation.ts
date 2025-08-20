import { Task, Assignment } from '../types/task';

/**
 * Validates if a task can be dropped into a time slot.
 * Checks time constraints and conflicts with existing assignments.
 *
 * @param task - The task to be dropped
 * @param day - The day of the time slot
 * @param timeSlot - The time slot (e.g., '08:00')
 * @param existingAssignments - Array of existing assignments for conflict checking
 * @returns boolean - True if the drop is valid, false otherwise
 */
export const validateTaskDrop = (
  task: Task,
  day: string,
  timeSlot: string,
  existingAssignments: Assignment[]
): boolean => {
  // Time constraint validation
  if (task.start_time && task.end_time) {
    const slotTime = new Date(`2000-01-01T${timeSlot}`);
    const startTime = new Date(`2000-01-01T${task.start_time}`);
    const endTime = new Date(`2000-01-01T${task.end_time}`);
    
    if (slotTime < startTime || slotTime > endTime) {
      return false;
    }
  }

  // Conflict checking
  const hasConflict = existingAssignments.some(assignment => {
    if (assignment.day !== day) return false;
    
    const assignmentStart = new Date(`2000-01-01T${assignment.startTime}`);
    const assignmentEnd = new Date(assignmentStart.getTime() + assignment.duration * 60000);
    const dropStart = new Date(`2000-01-01T${timeSlot}`);
    const dropEnd = new Date(dropStart.getTime() + (task.end_time && task.start_time ? new Date(`2000-01-01T${task.end_time}`).getTime() - new Date(`2000-01-01T${task.start_time}`).getTime() : 60000));

    return (
      (dropStart < assignmentEnd && dropEnd > assignmentStart)
    );
  });

  return !hasConflict;
}; 