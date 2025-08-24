import { api } from './api';
import type { Assignment } from '@/types/assignment';

export interface CreateAssignmentRequest {
  taskId: number;
  aideId: number;
  day: string;
  startTime: string;
  duration: number;
}

export interface UpdateAssignmentRequest extends Partial<CreateAssignmentRequest> {
  status?: string;
}

export interface BatchAssignmentRequest {
  taskId: number;
  aideId: number;
  days: string[];
  startTime: string;
  duration: number;
}

export interface ConflictCheckRequest {
  aideId: number;
  day: string;
  startTime: string;
  duration: number;
  excludeAssignmentId?: number;
}

export interface ConflictCheckResponse {
  hasConflict: boolean;
  conflictingAssignment?: Assignment;
}

// Backend response format for assignments
interface AssignmentsResponse {
  items: Assignment[];
}

// Assignment API functions
export const assignmentsApi = {
  // Get all assignments
  getAll: async () => {
    const response = await api.get<AssignmentsResponse>('/assignments');
    return { data: response.items };
  },
  
  // Get weekly assignments matrix
  getWeeklyMatrix: async (week: string) => {
    const response = await api.get<AssignmentsResponse>(`/assignments?week=${week}`);
    return { data: response.items };
  },
  
  // Get assignment by ID
  getById: (id: number) => api.get<Assignment>(`/assignments/${id}`),
  
  // Create single assignment
  create: (data: CreateAssignmentRequest) => api.post<Assignment>('/assignments', data),
  
  // Update assignment
  update: (id: number, data: UpdateAssignmentRequest) => api.patch<Assignment>(`/assignments/${id}`, data),
  
  // Delete assignment
  delete: (id: number) => api.delete(`/assignments/${id}`),
  
  // Batch create assignments
  createBatch: (data: BatchAssignmentRequest) => api.post<Assignment[]>('/assignments/batch', data),
  
  // Check for conflicts
  checkConflict: (data: ConflictCheckRequest) => 
    api.post<ConflictCheckResponse>('/assignments/check', data),
  
  // Get assignments by aide
  getByAide: async (aideId: number, week?: string) => {
    const params = week ? `?week=${week}` : '';
    const response = await api.get<AssignmentsResponse>(`/assignments/aide/${aideId}${params}`);
    return { data: response.items };
  },
  
  // Get assignments by task
  getByTask: async (taskId: number) => {
    const response = await api.get<AssignmentsResponse>(`/assignments/task/${taskId}`);
    return { data: response.items };
  },
  
  // Get assignments by day
  getByDay: async (day: string) => {
    const response = await api.get<AssignmentsResponse>(`/assignments/day/${day}`);
    return { data: response.items };
  },
};
