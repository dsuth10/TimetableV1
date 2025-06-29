import type { Assignment } from './assignment';

export type { Assignment };

export interface TeacherAide {
  id: number;
  name: string;
  qualifications: string;
  colour_hex: string;
  email?: string; // Make optional if not always present
  status?: 'ACTIVE' | 'INACTIVE'; // Make optional if not always present
}

export interface Absence {
  id: number;
  aide_id: number;
  start_date: string; // ISO date string
  end_date: string;   // ISO date string
  notes?: string;
}
