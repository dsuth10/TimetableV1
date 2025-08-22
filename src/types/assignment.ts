export interface Assignment {
  id: number;
  task_id: number;
  aide_id: number | null;
  date: string;
  start_time: string;
  end_time: string;
  status: 'UNASSIGNED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETE';
  task_title: string;
  task_category: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}
