import { api } from './api';
import type { TeacherAide, Availability } from '@/types';

export interface CreateAideRequest {
  name: string;
  qualifications: string;
  colour_hex: string;
  email?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateAideRequest extends Partial<CreateAideRequest> {}

export interface CreateAvailabilityRequest {
  aide_id: number;
  weekday: string;
  start_time: string;
  end_time: string;
}

export interface UpdateAvailabilityRequest extends Partial<CreateAvailabilityRequest> {}

// Aide API functions
export const aidesApi = {
  // Get all aides
  getAll: () => api.get<TeacherAide[]>('/aides'),
  
  // Get aide by ID
  getById: (id: number) => api.get<TeacherAide>(`/aides/${id}`),
  
  // Create new aide
  create: (data: CreateAideRequest) => api.post<TeacherAide>('/aides', data),
  
  // Update aide
  update: (id: number, data: UpdateAideRequest) => api.put<TeacherAide>(`/aides/${id}`, data),
  
  // Delete aide
  delete: (id: number) => api.delete(`/aides/${id}`),
  
  // Get aide availability
  getAvailability: (id: number) => api.get<Availability[]>(`/aides/${id}/availability`),
  
  // Add availability
  addAvailability: (id: number, data: CreateAvailabilityRequest) => 
    api.post<Availability>(`/aides/${id}/availability`, data),
  
  // Update availability
  updateAvailability: (aideId: number, availabilityId: number, data: UpdateAvailabilityRequest) =>
    api.put<Availability>(`/aides/${aideId}/availability/${availabilityId}`, data),
  
  // Delete availability
  deleteAvailability: (aideId: number, availabilityId: number) =>
    api.delete(`/aides/${aideId}/availability/${availabilityId}`),
};
