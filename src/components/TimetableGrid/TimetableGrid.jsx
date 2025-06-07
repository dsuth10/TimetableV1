import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTimetableData } from '../../store/slices/timetableSlice';
import './TimetableGrid.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => {
  const hour = Math.floor((i + 16) / 2);
  const minute = (i + 16) % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

const TimetableGrid = () => {
  const dispatch = useDispatch();
  const { aides, assignments, absences, loading, error } = useSelector(
    (state) => state.timetable
  );

  useEffect(() => {
    dispatch(fetchTimetableData());
  }, [dispatch]);

  if (loading) return <div className="loading">Loading timetable...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const getAssignmentForSlot = (aideId, day, time) => {
    return assignments.find(
      (a) =>
        a.aideId === aideId &&
        a.day === day &&
        a.startTime <= time &&
        a.endTime > time
    );
  };

  const isAideAbsent = (aideId, day) => {
    return absences.some((a) => a.aideId === aideId && a.day === day);
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
          {aides.map((aide) => (
            <div
              key={`${day}-${aide.id}`}
              className={`aide-column ${isAideAbsent(aide.id, day) ? 'absent' : ''}`}
              role="cell"
            >
              <div className="aide-header" style={{ backgroundColor: aide.color }}>
                {aide.name}
              </div>
              {TIME_SLOTS.map((time) => {
                const assignment = getAssignmentForSlot(aide.id, day, time);
                return (
                  <div
                    key={`${day}-${aide.id}-${time}`}
                    className={`time-slot ${assignment ? 'occupied' : ''}`}
                    role="gridcell"
                    aria-label={
                      assignment
                        ? `${assignment.task} from ${assignment.startTime} to ${assignment.endTime}`
                        : `Empty slot at ${time}`
                    }
                    data-tooltip={
                      assignment
                        ? `${assignment.task}\n${assignment.startTime}-${assignment.endTime}`
                        : ''
                    }
                  >
                    {assignment && (
                      <div
                        className="assignment"
                        style={{ backgroundColor: assignment.categoryColor }}
                      >
                        {assignment.task}
                      </div>
                    )}
                  </div>
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