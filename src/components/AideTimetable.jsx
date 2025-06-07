import React from 'react';
import './AideTimetable.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIMES = [
  '9:00 - 9:30', '9:30 - 10:00', '10:00 - 10:30', '10:30 - 11:00',
  '11:00 - 11:30', '11:30 - 12:00', '12:00 - 12:30', '12:30 - 1:00',
  '1:00 - 1:30', '1:30 - 2:00', '2:00 - 2:30', '2:30 - 3:00',
];

function parseTime(str) {
  // "9:00" or "13:30" => minutes since midnight
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

function slotMatchesAssignment(day, slotStart, slotEnd, assignment) {
  if (assignment.day !== day) return false;
  const aStart = parseTime(assignment.startTime);
  const aEnd = parseTime(assignment.endTime);
  // Overlap: slotStart < aEnd && aStart < slotEnd
  return slotStart < aEnd && aStart < slotEnd;
}

function getCellContent(day, time, assignments, absences) {
  if (time.includes('12:00') || time.includes('12:30')) return { label: 'Lunch Break', type: 'lunch' };
  if (absences.some(a => a.day === day)) return { label: 'Unavailable', type: 'unavailable' };
  // Parse slot start/end
  const [slotStartStr, slotEndStr] = time.split(' - ');
  const slotStart = parseTime(slotStartStr);
  const slotEnd = parseTime(slotEndStr);
  const assignment = assignments.find(a => slotMatchesAssignment(day, slotStart, slotEnd, a));
  if (assignment) return { label: assignment.task, type: 'assignment' };
  return { label: 'Unassigned', type: 'unassigned' };
}

const AideTimetable = ({ aide, assignments = [], absences = [] }) => (
  <div className="aide-timetable">
    <h2 className="aide-name">{aide.name} Schedule</h2>
    <div className="timetable-grid" role="table" aria-label={`Schedule for ${aide.name}`}>
      <div className="timetable-header-row" role="row">
        <div className="timetable-header-cell" role="columnheader">Time</div>
        {DAYS.map(day => (
          <div key={day} className="timetable-header-cell" role="columnheader">{day}</div>
        ))}
      </div>
      {TIMES.map(time => (
        <div className="timetable-row" role="row" key={time}>
          <div className="timetable-time-cell" role="rowheader">{time}</div>
          {DAYS.map(day => {
            const cell = getCellContent(day, time, assignments, absences);
            return (
              <div
                key={day}
                className={`timetable-cell ${cell.type}`}
                role="gridcell"
                aria-label={`${day} ${time}: ${cell.label}`}
              >
                {cell.label}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  </div>
);

export default AideTimetable; 