export interface Task {
  id: number;
  title: string;
  category: string;
  start_time: string;
  end_time: string;
  recurrence_rule?: string;
  expires_on?: string;
  classroom_id?: number;
  school_class_id?: number;
  notes?: string;
  status: string;
  is_flexible: boolean;
  classroom?: {
    id: number;
    name: string;
  };
  school_class?: {
    id: number;
    class_code: string;
    teacher: string;
  };
}
