import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import './TimetableGrid.css';
import type { Assignment, TeacherAide } from '../../types'; // Adjust path if necessary

interface TimetableGridProps {
  assignments: Assignment[];
  teacherAides: TeacherAide[];
  isLoading: boolean;
  absences: any[]; // Assuming absences will be passed as a prop
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

const TimetableGrid: React.FC<TimetableGridProps> = ({ assignments, teacherAides, isLoading, absences }) => {
  if (isLoading) return <div className="loading">Loading timetable...</div>;
  // Note: error handling should be done in the parent component (Schedule.tsx)

  // Ensure teacherAides and absences are arrays before use
  const validTeacherAides = Array.isArray(teacherAides) ? teacherAides : [];
  const validAbsences = Array.isArray(absences) ? absences : [];

  const getAssignmentForSlot = (aideId: number, day: string, time: string) => {
    return assignments.find(
      (a) =>
        a.aide_id === aideId &&
        a.day === day &&
        a.start_time && a.start_time <= time && // Check for undefined
        a.end_time && a.end_time > time &&      // Check for undefined
        a.status === 'ASSIGNED' // Only show assigned tasks in the grid
    );
  };

  const isAideAbsent = (aideId: number, day: string) => {
    // Assuming 'day' is full day name and absence.date is ISO string or Date object
    const dayIndex = DAYS.indexOf(day);
    const today = new Date(); // This needs to be dynamic based on the week being viewed
    const currentDay = new Date(today.setDate(today.getDate() - today.getDay() + 1 + dayIndex)); // Get Monday + dayIndex
    
    return validAbsences.some(
      (abs) =>
        abs.aide_id === aideId &&
        new Date(abs.start_date).toDateString() <= currentDay.toDateString() &&
        new Date(abs.end_date).toDateString() >= currentDay.toDateString()
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
              <div className="aide-header" style={{ backgroundColor: aide.colour_hex }}>
                {aide.name}
              </div>
              {TIME_SLOTS.map((time) => {
                const assignment = getAssignmentForSlot(aide.id, day, time);
                const droppableId = `${aide.id}-${day}-${time}`;
                return (
                  <Droppable droppableId={droppableId} key={droppableId}>
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
                      >
                        {assignment && (
                          <Draggable draggableId={assignment.id.toString()} index={0}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="assignment"
                                style={{
                                  backgroundColor: CATEGORY_COLORS[assignment.task_category] || '#ccc',
                                  border: snapshot.isDragging ? '2px solid #3f51b5' : 'none',
                                  boxShadow: snapshot.isDragging ? '0px 0px 10px rgba(0,0,0,0.3)' : 'none',
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
