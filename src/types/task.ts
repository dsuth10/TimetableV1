export interface Task {
  id: number;
  title: string;
  category: string;
  startTime?: string;      // Optional - for time-constrained tasks
  endTime?: string;        // Optional - for time-constrained tasks
  duration: number;        // Duration in minutes
  isTimeConstrained: boolean;
  classroomId?: number;
  notes?: string;
}

export interface Assignment {
  id: number;
  taskId: number;
  aideId: number;
  day: string;
  startTime: string;
  duration: number;
} 