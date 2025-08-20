import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SchoolClass } from '@/types';

export interface SchoolClassesState {
  schoolClasses: SchoolClass[];
  loading: boolean;
  error: string | null;
  selectedSchoolClassId: number | null;
}

export interface SchoolClassesActions {
  setSchoolClasses: (schoolClasses: SchoolClass[]) => void;
  addSchoolClass: (schoolClass: SchoolClass) => void;
  updateSchoolClass: (id: number, updates: Partial<SchoolClass>) => void;
  deleteSchoolClass: (id: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedSchoolClassId: (id: number | null) => void;
  getSchoolClassById: (id: number) => SchoolClass | undefined;
  getSchoolClassesByGrade: (grade: string) => SchoolClass[];
}

export type SchoolClassesStore = SchoolClassesState & SchoolClassesActions;

export const useSchoolClassesStore = create<SchoolClassesStore>()(
  persist(
    (set, get) => ({
      schoolClasses: [],
      loading: false,
      error: null,
      selectedSchoolClassId: null,

      setSchoolClasses: (schoolClasses) => set({ schoolClasses, error: null }),
      addSchoolClass: (schoolClass) => set((state) => ({
        schoolClasses: [...state.schoolClasses, schoolClass],
        error: null,
      })),
      updateSchoolClass: (id, updates) => set((state) => ({
        schoolClasses: state.schoolClasses.map((schoolClass) =>
          schoolClass.id === id ? { ...schoolClass, ...updates } : schoolClass
        ),
        error: null,
      })),
      deleteSchoolClass: (id) => set((state) => ({
        schoolClasses: state.schoolClasses.filter((schoolClass) => schoolClass.id !== id),
        selectedSchoolClassId: state.selectedSchoolClassId === id ? null : state.selectedSchoolClassId,
        error: null,
      })),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setSelectedSchoolClassId: (selectedSchoolClassId) => set({ selectedSchoolClassId }),

      getSchoolClassById: (id) => {
        const state = get();
        return state.schoolClasses.find((schoolClass) => schoolClass.id === id);
      },
      getSchoolClassesByGrade: (grade) => {
        const state = get();
        return state.schoolClasses.filter((schoolClass) => schoolClass.grade === grade);
      },
    }),
    {
      name: 'school-classes-storage',
      partialize: (state) => ({ schoolClasses: state.schoolClasses }),
    }
  )
);
