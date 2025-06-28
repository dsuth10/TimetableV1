export interface Assignment {
  id: number;
  task_id: number;
  task_title: string;
  task_category: string;
  start_time: string;
  end_time: string;
  date: string;
  aide_id: number | null;
  aide_name: string | null;
  classroom_id: number | null;
  classroom_name: string | null;
  status: 'UNASSIGNED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETE';
  is_flexible: boolean;
}

export interface Task {
  id: number;
  title: string;
  category: string;
  start_time: string | null;
  end_time: string | null;
  is_flexible: boolean;
  classroom_id: number | null;
  recurrence_rule: string | null;
}

export interface TeacherAide {
  id: number;
  name: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Classroom {
  id: number;
  name: string;
  capacity: number;
} 