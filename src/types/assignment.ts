export interface Assignment {
  id: number;
  task_title: string;
  task_category: string;
  start_time: string;
  end_time: string;
  classroom_name?: string;
  teacher_aide_id: number | null;
  day?: string;
  time_slot?: string;
  status: 'ASSIGNED' | 'UNASSIGNED';
} 