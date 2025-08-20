import { api } from './api';
import type { Classroom } from '@/types';

export interface CreateClassroomRequest {
  name: string;
  capacity: number;
  notes?: string;
}

export interface UpdateClassroomRequest extends Partial<CreateClassroomRequest> {}

// Classroom API functions
export const classroomsApi = {
  // Get all classrooms
  getAll: () => api.get<Classroom[]>('/classrooms'),
  
  // Get classroom by ID
  getById: (id: number) => api.get<Classroom>(`/classrooms/${id}`),
  
  // Create new classroom
  create: (data: CreateClassroomRequest) => api.post<Classroom>('/classrooms', data),
  
  // Update classroom
  update: (id: number, data: UpdateClassroomRequest) => api.put<Classroom>(`/classrooms/${id}`, data),
  
  // Delete classroom
  delete: (id: number) => api.delete(`/classrooms/${id}`),
};
