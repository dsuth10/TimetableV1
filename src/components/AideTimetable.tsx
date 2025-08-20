import React from 'react';
import './AideTimetable.css';
import TimetableView from './TimetableView';
import { Assignment } from '../types/assignment';
import { TeacherAide } from '../types';

interface AideTimetableProps {
  aide: TeacherAide;
  assignments: Assignment[];
  absences: any[]; // Consider defining a proper type for absences if needed
  onUpdateAssignmentStatus: (assignmentId: number, status: Assignment['status']) => void;
}

const AideTimetable: React.FC<AideTimetableProps> = ({ aide, assignments = [], onUpdateAssignmentStatus }) => (
  <div className="aide-timetable">
    <h2 className="aide-name">{aide.name} Schedule</h2>
    <TimetableView
      assignments={assignments}
      teacherAides={[aide]} // Pass the current aide as a single-element array
      isLoading={false} // Assuming data is loaded by parent Schedule component
      onUpdateAssignmentStatus={onUpdateAssignmentStatus}
    />
  </div>
);

export default AideTimetable;
