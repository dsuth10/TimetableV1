export interface Assignment {
  id: number;
  task_title: string;
  task_category: string;
  classroom_name?: string;
  aide_id: number | null; // Changed from teacher_aide_id to aide_id for consistency with backend
  date?: string; // Make optional for unassigned tasks
  day?: string; // Make optional for unassigned tasks
  time_slot?: string; // Make optional for unassigned tasks
  start_time?: string; // Make optional for unassigned tasks
  end_time?: string; // Make optional for unassigned tasks
  status: 'ASSIGNED' | 'UNASSIGNED';
  notes?: string;
}
