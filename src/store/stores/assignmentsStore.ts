import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Assignment } from '@/types/task';

export interface AssignmentsState {
  assignments: Assignment[];
  loading: boolean;
  error: string | null;
  selectedAssignmentId: number | null;
  filters: {
    aideId: number | null;
    taskId: number | null;
    day: string | null;
  };
}

export interface AssignmentsActions {
  // Data management
  setAssignments: (assignments: Assignment[]) => void;
  addAssignment: (assignment: Assignment) => void;
  updateAssignment: (id: number, updates: Partial<Assignment>) => void;
  deleteAssignment: (id: number) => void;
  
  // Loading states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Selection
  setSelectedAssignmentId: (id: number | null) => void;
  
  // Filters
  setFilters: (filters: Partial<AssignmentsState['filters']>) => void;
  clearFilters: () => void;
  
  // Computed selectors
  getAssignmentById: (id: number) => Assignment | undefined;
  getAssignmentsByAide: (aideId: number) => Assignment[];
  getAssignmentsByDay: (day: string) => Assignment[];
  getAssignmentsByTask: (taskId: number) => Assignment[];
  getWeeklyAssignments: (weekStart: string) => Assignment[];
}

export type AssignmentsStore = AssignmentsState & AssignmentsActions;

export const useAssignmentsStore = create<AssignmentsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      assignments: [],
      loading: false,
      error: null,
      selectedAssignmentId: null,
      filters: {
        aideId: null,
        taskId: null,
        day: null,
      },

      // Actions
      setAssignments: (assignments) => set({ assignments, error: null }),
      
      addAssignment: (assignment) => set((state) => ({
        assignments: [...state.assignments, assignment],
        error: null,
      })),
      
      updateAssignment: (id, updates) => set((state) => ({
        assignments: state.assignments.map((assignment) =>
          assignment.id === id ? { ...assignment, ...updates } : assignment
        ),
        error: null,
      })),
      
      deleteAssignment: (id) => set((state) => ({
        assignments: state.assignments.filter((assignment) => assignment.id !== id),
        selectedAssignmentId: state.selectedAssignmentId === id ? null : state.selectedAssignmentId,
        error: null,
      })),
      
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      setSelectedAssignmentId: (selectedAssignmentId) => set({ selectedAssignmentId }),
      
      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters },
      })),
      
      clearFilters: () => set(() => ({
        filters: {
          aideId: null,
          taskId: null,
          day: null,
        },
      })),

      // Computed selectors
      getAssignmentById: (id) => {
        const state = get();
        return state.assignments.find((assignment) => assignment.id === id);
      },
      
      getAssignmentsByAide: (aideId) => {
        const state = get();
        return state.assignments.filter((assignment) => assignment.aideId === aideId);
      },
      
      getAssignmentsByDay: (day) => {
        const state = get();
        return state.assignments.filter((assignment) => assignment.day === day);
      },
      
      getAssignmentsByTask: (taskId) => {
        const state = get();
        return state.assignments.filter((assignment) => assignment.taskId === taskId);
      },
      
      getWeeklyAssignments: () => {
        const state = get();
        // This would need to be implemented based on your date logic
        // For now, returning all assignments
        return state.assignments;
      },
    }),
    {
      name: 'assignments-storage',
      partialize: (state) => ({ assignments: state.assignments }),
    }
  )
);
