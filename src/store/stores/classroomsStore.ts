import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Classroom } from '@/types';

export interface ClassroomsState {
  classrooms: Classroom[];
  loading: boolean;
  error: string | null;
  selectedClassroomId: number | null;
}

export interface ClassroomsActions {
  setClassrooms: (classrooms: Classroom[]) => void;
  addClassroom: (classroom: Classroom) => void;
  updateClassroom: (id: number, updates: Partial<Classroom>) => void;
  deleteClassroom: (id: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedClassroomId: (id: number | null) => void;
  getClassroomById: (id: number) => Classroom | undefined;
}

export type ClassroomsStore = ClassroomsState & ClassroomsActions;

export const useClassroomsStore = create<ClassroomsStore>()(
  persist(
    (set, get) => ({
      classrooms: [],
      loading: false,
      error: null,
      selectedClassroomId: null,

      setClassrooms: (classrooms) => set({ classrooms, error: null }),
      addClassroom: (classroom) => set((state) => ({
        classrooms: [...state.classrooms, classroom],
        error: null,
      })),
      updateClassroom: (id, updates) => set((state) => ({
        classrooms: state.classrooms.map((classroom) =>
          classroom.id === id ? { ...classroom, ...updates } : classroom
        ),
        error: null,
      })),
      deleteClassroom: (id) => set((state) => ({
        classrooms: state.classrooms.filter((classroom) => classroom.id !== id),
        selectedClassroomId: state.selectedClassroomId === id ? null : state.selectedClassroomId,
        error: null,
      })),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setSelectedClassroomId: (selectedClassroomId) => set({ selectedClassroomId }),

      getClassroomById: (id) => {
        const state = get();
        return state.classrooms.find((classroom) => classroom.id === id);
      },
    }),
    {
      name: 'classrooms-storage',
      partialize: (state) => ({ classrooms: state.classrooms }),
    }
  )
);
