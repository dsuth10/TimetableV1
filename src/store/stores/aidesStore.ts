import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TeacherAide } from '@/types';

export interface AidesState {
  aides: TeacherAide[];
  loading: boolean;
  error: string | null;
  selectedAideId: number | null;
}

export interface AidesActions {
  // Data management
  setAides: (aides: TeacherAide[]) => void;
  addAide: (aide: TeacherAide) => void;
  updateAide: (id: number, updates: Partial<TeacherAide>) => void;
  deleteAide: (id: number) => void;
  
  // Loading states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Selection
  setSelectedAideId: (id: number | null) => void;
  
  // Computed selectors
  getAideById: (id: number) => TeacherAide | undefined;
  getActiveAides: () => TeacherAide[];
}

export type AidesStore = AidesState & AidesActions;

export const useAidesStore = create<AidesStore>()(
  persist(
    (set, get) => ({
      // Initial state
      aides: [],
      loading: false,
      error: null,
      selectedAideId: null,

      // Actions
      setAides: (aides) => set({ aides, error: null }),
      
      addAide: (aide) => set((state) => ({
        aides: [...state.aides, aide],
        error: null,
      })),
      
      updateAide: (id, updates) => set((state) => ({
        aides: state.aides.map((aide) =>
          aide.id === id ? { ...aide, ...updates } : aide
        ),
        error: null,
      })),
      
      deleteAide: (id) => set((state) => ({
        aides: state.aides.filter((aide) => aide.id !== id),
        selectedAideId: state.selectedAideId === id ? null : state.selectedAideId,
        error: null,
      })),
      
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      setSelectedAideId: (selectedAideId) => set({ selectedAideId }),

      // Computed selectors
      getAideById: (id) => {
        const state = get();
        return state.aides.find((aide) => aide.id === id);
      },
      
      getActiveAides: () => {
        const state = get();
        return state.aides.filter((aide) => aide.status !== 'INACTIVE');
      },
    }),
    {
      name: 'aides-storage',
      partialize: (state) => ({ aides: state.aides }),
    }
  )
);
