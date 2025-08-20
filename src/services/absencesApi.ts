import { api } from './api';
import type { Absence } from '@/types';

export interface CreateAbsenceRequest {
  aide_id: number;
  start_date: string;
  end_date: string;
  notes?: string;
}

export interface UpdateAbsenceRequest extends Partial<CreateAbsenceRequest> {}

// Absence API functions
export const absencesApi = {
  // Get all absences with optional week filter
  getAll: (week?: string) => {
    const params = week ? `?week=${week}` : '';
    return api.get<Absence[]>(`/absences${params}`);
  },
  
  // Get absence by ID
  getById: (id: number) => api.get<Absence>(`/absences/${id}`),
  
  // Create new absence
  create: (data: CreateAbsenceRequest) => api.post<Absence>('/absences', data),
  
  // Update absence
  update: (id: number, data: UpdateAbsenceRequest) => api.put<Absence>(`/absences/${id}`, data),
  
  // Delete absence
  delete: (id: number) => api.delete(`/absences/${id}`),
  
  // Get absences by aide
  getByAide: (aideId: number) => api.get<Absence[]>(`/absences/aide/${aideId}`),
  
  // Get absences by date range
  getByDateRange: (startDate: string, endDate: string) => 
    api.get<Absence[]>(`/absences?start_date=${startDate}&end_date=${endDate}`),
};
