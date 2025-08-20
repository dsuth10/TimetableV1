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

// Assignment API functions
export const assignmentsApi = {
  // Get all assignments
  getAll: () => api.get<Assignment[]>('/assignments'),
  
  // Get weekly assignments matrix
  getWeeklyMatrix: (week: string) => api.get<Assignment[]>(`/assignments?week=${week}`),
  
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
  getByAide: (aideId: number, week?: string) => {
    const params = week ? `?week=${week}` : '';
    return api.get<Assignment[]>(`/assignments/aide/${aideId}${params}`);
  },
  
  // Get assignments by task
  getByTask: (taskId: number) => api.get<Assignment[]>(`/assignments/task/${taskId}`),
  
  // Get assignments by day
  getByDay: (day: string) => api.get<Assignment[]>(`/assignments/day/${day}`),
};
