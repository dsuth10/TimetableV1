import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import './TimetableGrid.css';
import type { Assignment, TeacherAide } from '../../types'; // Adjust path if necessary

interface TimetableGridProps {
  assignments: Assignment[];
  teacherAides: TeacherAide[];
  isLoading: boolean;
  absences: any[]; // Assuming absences will be passed as a prop
  renderKey?: number; // Force re-render key for draggable registration
  weekStartDate?: Date; // Optional week start date for dynamic date calculation
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => {
  const hour = Math.floor((i + 16) / 2);
  const minute = (i + 16) % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

const CATEGORY_COLORS: { [key: string]: string } = {
  PLAYGROUND: '#FFD700', // Gold
  CLASS_SUPPORT: '#87CEEB', // SkyBlue
  GROUP_SUPPORT: '#90EE90', // LightGreen
  INDIVIDUAL_SUPPORT: '#FF6347', // Tomato
  // Add other categories as needed
};

// Helper function to get the Monday of the current week
const getCurrentWeekMonday = (): Date => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek + 1);
  return monday;
};

const TimetableGrid: React.FC<TimetableGridProps> = ({ 
  assignments, 
  teacherAides, 
  isLoading, 
  absences, 
  renderKey = 0,
  weekStartDate 
}) => {
  if (isLoading) return <div className="loading">Loading timetable...</div>;
  // Note: error handling should be done in the parent component (Schedule.tsx)

  // Ensure teacherAides and absences are arrays before use
  const validTeacherAides = Array.isArray(teacherAides) ? teacherAides : [];
  const validAbsences = Array.isArray(absences) ? absences : [];

  const getAssignmentForSlot = (aideId: number, day: string, time: string) => {
    return assignments.find(
      (a) => {
        // Convert assignment date to day name for comparison
        const assignmentDate = new Date(a.date);
        const assignmentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][assignmentDate.getDay()];
        
        return (
          a.aide_id === aideId &&
          assignmentDay === day &&
          a.start_time && a.start_time <= time && // Check for undefined
          a.end_time && a.end_time > time &&      // Check for undefined
          a.status === 'ASSIGNED' // Only show assigned tasks in the grid
        );
      }
    );
  };

  // Helper function to determine if this time slot should render the draggable element
  // Only render the draggable element at the start time of the assignment
  const shouldRenderDraggable = (aideId: number, day: string, time: string) => {
    const assignment = getAssignmentForSlot(aideId, day, time);
    if (!assignment) return false;
    
    // Only render the draggable element at the exact start time
    return assignment.start_time === time;
  };

  const isAideAbsent = (aideId: number, day: string) => {
    const dayIndex = DAYS.indexOf(day);
    
    // Use provided week start date or calculate current week's Monday
    const referenceDate = weekStartDate || getCurrentWeekMonday();
    const currentDay = new Date(referenceDate);
    currentDay.setDate(referenceDate.getDate() + dayIndex);
    
    // Format the current day as YYYY-MM-DD for reliable comparison
    const currentDayStr = currentDay.toISOString().split('T')[0];
    
    return validAbsences.some(
      (abs) =>
        abs.aide_id === aideId &&
        abs.start_date <= currentDayStr &&
        abs.end_date >= currentDayStr
    );
  };

  return (
    <div className="timetable-grid" role="grid" aria-label="Weekly timetable">
      {/* Time column */}
      <div className="time-column">
        <div className="header-cell"></div>
        {TIME_SLOTS.map((time) => (
          <div key={time} className="time-cell" role="rowheader">
            {time}
          </div>
        ))}
      </div>

      {/* Days and aides grid */}
      {DAYS.map((day) => (
        <div key={day} className="day-column" role="column">
          <div className="header-cell" role="columnheader">
            {day}
          </div>
          {validTeacherAides.map((aide) => (
            <div
              key={`${day}-${aide.id}`}
              className={`aide-column ${isAideAbsent(aide.id, day) ? 'absent' : ''}`}
              role="cell"
            >
              {TIME_SLOTS.map((time) => {
                const assignment = getAssignmentForSlot(aide.id, day, time);
                const droppableId = `${aide.id}-${day}-${time}`;
                return (
                  <Droppable key={`${droppableId}-${renderKey}`} droppableId={droppableId}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`time-slot ${assignment ? 'occupied' : ''} ${
                          snapshot.isDraggingOver ? 'dragging-over' : ''
                        }`}
                        role="gridcell"
                        aria-label={
                          assignment
                            ? `${assignment.task_title} from ${assignment.start_time} to ${assignment.end_time} assigned to ${aide.name}`
                            : `Empty slot for ${aide.name} at ${time}`
                        }
                        data-tooltip={
                          assignment
                            ? `${assignment.task_title}\n${assignment.start_time}-${assignment.end_time}\nNotes: ${assignment.notes || 'N/A'}`
                            : ''
                        }
                        data-testid={`time-slot-${droppableId}`}
                        style={{
                          position: 'relative',
                          zIndex: snapshot.isDraggingOver ? 10 : 1,
                          backgroundColor: snapshot.isDraggingOver ? '#e3f2fd' : 'transparent',
                          border: snapshot.isDraggingOver ? '2px dashed #2196f3' : '1px solid transparent',
                        }}
                      >
                        {assignment && shouldRenderDraggable(aide.id, day, time) && (
                          <Draggable key={`draggable-${assignment.id}-${renderKey}`} draggableId={assignment.id.toString()} index={0}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="assignment"
                                data-testid={`assignment-${assignment.id}`}
                                style={{
                                  backgroundColor: CATEGORY_COLORS[assignment.task_category] || '#ccc',
                                  border: snapshot.isDragging ? '2px solid #3f51b5' : 'none',
                                  boxShadow: snapshot.isDragging ? '0px 0px 10px rgba(0,0,0,0.3)' : 'none',
                                  transform: snapshot.isDragging ? provided.draggableProps.style?.transform : 'none',
                                }}
                              >
                                {assignment.task_title}
                              </div>
                            )}
                          </Draggable>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default TimetableGrid;
