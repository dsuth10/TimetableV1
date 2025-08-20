import { api } from './api';
import type { SchoolClass } from '@/types';

export interface CreateSchoolClassRequest {
  class_code: string;
  grade: string;
  teacher: string;
  notes?: string;
}

export interface UpdateSchoolClassRequest extends Partial<CreateSchoolClassRequest> {}

// School Class API functions
export const schoolClassesApi = {
  // Get all school classes
  getAll: () => api.get<SchoolClass[]>('/school-classes'),
  
  // Get school class by ID
  getById: (id: number) => api.get<SchoolClass>(`/school-classes/${id}`),
  
  // Create new school class
  create: (data: CreateSchoolClassRequest) => api.post<SchoolClass>('/school-classes', data),
  
  // Update school class
  update: (id: number, data: UpdateSchoolClassRequest) => api.put<SchoolClass>(`/school-classes/${id}`, data),
  
  // Delete school class
  delete: (id: number) => api.delete(`/school-classes/${id}`),
  
  // Get school classes by grade
  getByGrade: (grade: string) => api.get<SchoolClass[]>(`/school-classes?grade=${grade}`),
};
