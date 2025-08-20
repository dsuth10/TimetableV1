import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task } from '@/types/task';

export interface TasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  selectedTaskId: number | null;
  filters: {
    category: string | null;
    status: string | null;
    classroomId: number | null;
  };
}

export interface TasksActions {
  // Data management
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: number, updates: Partial<Task>) => void;
  deleteTask: (id: number) => void;
  
  // Loading states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Selection
  setSelectedTaskId: (id: number | null) => void;
  
  // Filters
  setFilters: (filters: Partial<TasksState['filters']>) => void;
  clearFilters: () => void;
  
  // Computed selectors
  getTaskById: (id: number) => Task | undefined;
  getFilteredTasks: () => Task[];
  getUnassignedTasks: () => Task[];
  getTasksByCategory: (category: string) => Task[];
}

export type TasksStore = TasksState & TasksActions;

export const useTasksStore = create<TasksStore>()(
  persist(
    (set, get) => ({
      // Initial state
      tasks: [],
      loading: false,
      error: null,
      selectedTaskId: null,
      filters: {
        category: null,
        status: null,
        classroomId: null,
      },

      // Actions
      setTasks: (tasks) => set({ tasks, error: null }),
      
      addTask: (task) => set((state) => ({
        tasks: [...state.tasks, task],
        error: null,
      })),
      
      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? { ...task, ...updates } : task
        ),
        error: null,
      })),
      
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
        selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
        error: null,
      })),
      
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      setSelectedTaskId: (selectedTaskId) => set({ selectedTaskId }),
      
      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters },
      })),
      
      clearFilters: () => set(() => ({
        filters: {
          category: null,
          status: null,
          classroomId: null,
        },
      })),

      // Computed selectors
      getTaskById: (id) => {
        const state = get();
        return state.tasks.find((task) => task.id === id);
      },
      
      getFilteredTasks: () => {
        const state = get();
        let filtered = state.tasks;
        
        if (state.filters.category) {
          filtered = filtered.filter((task) => task.category === state.filters.category);
        }
        
        if (state.filters.status) {
          filtered = filtered.filter((task) => task.status === state.filters.status);
        }
        
        if (state.filters.classroomId) {
          filtered = filtered.filter((task) => task.classroom_id === state.filters.classroomId);
        }
        
        return filtered;
      },
      
      getUnassignedTasks: () => {
        const state = get();
        return state.tasks.filter((task) => task.status === 'UNASSIGNED');
      },
      
      getTasksByCategory: (category) => {
        const state = get();
        return state.tasks.filter((task) => task.category === category);
      },
    }),
    {
      name: 'tasks-storage',
      partialize: (state) => ({ tasks: state.tasks }),
    }
  )
);
