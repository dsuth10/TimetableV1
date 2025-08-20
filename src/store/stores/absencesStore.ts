import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Absence } from '@/types';

export interface AbsencesState {
  absences: Absence[];
  loading: boolean;
  error: string | null;
  selectedAbsenceId: number | null;
}

export interface AbsencesActions {
  setAbsences: (absences: Absence[]) => void;
  addAbsence: (absence: Absence) => void;
  updateAbsence: (id: number, updates: Partial<Absence>) => void;
  deleteAbsence: (id: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedAbsenceId: (id: number | null) => void;
  getAbsenceById: (id: number) => Absence | undefined;
  getAbsencesByAide: (aideId: number) => Absence[];
  getAbsencesByDate: (date: string) => Absence[];
}

export type AbsencesStore = AbsencesState & AbsencesActions;

export const useAbsencesStore = create<AbsencesStore>()(
  persist(
    (set, get) => ({
      absences: [],
      loading: false,
      error: null,
      selectedAbsenceId: null,

      setAbsences: (absences) => set({ absences, error: null }),
      addAbsence: (absence) => set((state) => ({
        absences: [...state.absences, absence],
        error: null,
      })),
      updateAbsence: (id, updates) => set((state) => ({
        absences: state.absences.map((absence) =>
          absence.id === id ? { ...absence, ...updates } : absence
        ),
        error: null,
      })),
      deleteAbsence: (id) => set((state) => ({
        absences: state.absences.filter((absence) => absence.id !== id),
        selectedAbsenceId: state.selectedAbsenceId === id ? null : state.selectedAbsenceId,
        error: null,
      })),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setSelectedAbsenceId: (selectedAbsenceId) => set({ selectedAbsenceId }),

      getAbsenceById: (id) => {
        const state = get();
        return state.absences.find((absence) => absence.id === id);
      },
      getAbsencesByAide: (aideId) => {
        const state = get();
        return state.absences.filter((absence) => absence.aide_id === aideId);
      },
      getAbsencesByDate: (date) => {
        const state = get();
        return state.absences.filter((absence) => 
          absence.start_date <= date && absence.end_date >= date
        );
      },
    }),
    {
      name: 'absences-storage',
      partialize: (state) => ({ absences: state.absences }),
    }
  )
);
