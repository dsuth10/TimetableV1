import { api } from './api';
import type { Absence } from '@/types';

export interface CreateAbsenceRequest {
  aide_id: number;
  start_date: string;
  end_date: string;
  notes?: string;
}

export interface UpdateAbsenceRequest extends Partial<CreateAbsenceRequest> {}

// Backend response format for absences
interface AbsencesResponse {
  items: Absence[];
  page: number;
  pages: number;
  per_page: number;
  total: number;
}

// Absence API functions
export const absencesApi = {
  // Get all absences with optional week filter
  getAll: async (week?: string) => {
    const params = week ? `?week=${week}` : '';
    const response = await api.get<AbsencesResponse>(`/absences${params}`);
    return { data: response.items };
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
  getByAide: async (aideId: number) => {
    const response = await api.get<AbsencesResponse>(`/absences/aide/${aideId}`);
    return { data: response.items };
  },
  
  // Get absences by date range
  getByDateRange: async (startDate: string, endDate: string) => {
    const response = await api.get<AbsencesResponse>(`/absences?start_date=${startDate}&end_date=${endDate}`);
    return { data: response.items };
  },
};
