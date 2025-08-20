import { api } from './api';
import type { Task } from '@/types/task';

export interface CreateTaskRequest {
  title: string;
  category: string;
  start_time: string;
  end_time: string;
  recurrence_rule?: string;
  expires_on?: string;
  classroom_id?: number;
  school_class_id?: number;
  notes?: string;
  is_flexible?: boolean;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {}

export interface TaskFilters {
  category?: string;
  status?: string;
  classroom_id?: number;
  school_class_id?: number;
  page?: number;
  per_page?: number;
}

// Task API functions
export const tasksApi = {
  // Get all tasks with optional filters
  getAll: (filters?: TaskFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return api.get<Task[]>(`/tasks?${params.toString()}`);
  },
  
  // Get task by ID
  getById: (id: number) => api.get<Task>(`/tasks/${id}`),
  
  // Create new task
  create: (data: CreateTaskRequest) => api.post<Task>('/tasks', data),
  
  // Update task
  update: (id: number, data: UpdateTaskRequest) => api.put<Task>(`/tasks/${id}`, data),
  
  // Delete task
  delete: (id: number) => api.delete(`/tasks/${id}`),
  
  // Get tasks by category
  getByCategory: (category: string) => api.get<Task[]>(`/tasks?category=${category}`),
  
  // Get unassigned tasks
  getUnassigned: () => api.get<Task[]>('/tasks?status=UNASSIGNED'),
  
  // Create recurring task
  createRecurring: (data: CreateTaskRequest) => api.post<Task>('/recurring-tasks', data),
};
