import type { Assignment } from './assignment';

export type { Assignment };

export interface TeacherAide {
  id: number;
  name: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface UnassignedTask {
  id: number;
  title: string;
  duration: string;
  color: string;
}

export interface UnassignedTasksProps {
  tasks: UnassignedTask[];
}

export interface TimetableViewProps {
  assignments: Assignment[];
  teacherAides: TeacherAide[];
  isLoading?: boolean;
} 