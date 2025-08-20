import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface UIState {
  // Modal states
  isTaskModalOpen: boolean;
  isAideModalOpen: boolean;
  isAbsenceModalOpen: boolean;
  isConflictModalOpen: boolean;
  
  // Sidebar state
  isSidebarOpen: boolean;
  
  // Theme
  isDarkMode: boolean;
  
  // Notifications
  toasts: Toast[];
  
  // Loading states
  globalLoading: boolean;
  
  // Current week
  currentWeek: string; // YYYY-WW format
}

export interface UIActions {
  // Modal actions
  openTaskModal: () => void;
  closeTaskModal: () => void;
  openAideModal: () => void;
  closeAideModal: () => void;
  openAbsenceModal: () => void;
  closeAbsenceModal: () => void;
  openConflictModal: () => void;
  closeConflictModal: () => void;
  
  // Sidebar actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Theme actions
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
  
  // Toast actions
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
  // Loading actions
  setGlobalLoading: (loading: boolean) => void;
  
  // Week navigation
  setCurrentWeek: (week: string) => void;
  goToNextWeek: () => void;
  goToPreviousWeek: () => void;
  goToCurrentWeek: () => void;
}

export type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isTaskModalOpen: false,
      isAideModalOpen: false,
      isAbsenceModalOpen: false,
      isConflictModalOpen: false,
      isSidebarOpen: true,
      isDarkMode: false,
      toasts: [],
      globalLoading: false,
      currentWeek: getCurrentWeek(),

      // Modal actions
      openTaskModal: () => set({ isTaskModalOpen: true }),
      closeTaskModal: () => set({ isTaskModalOpen: false }),
      openAideModal: () => set({ isAideModalOpen: true }),
      closeAideModal: () => set({ isAideModalOpen: false }),
      openAbsenceModal: () => set({ isAbsenceModalOpen: true }),
      closeAbsenceModal: () => set({ isAbsenceModalOpen: false }),
      openConflictModal: () => set({ isConflictModalOpen: true }),
      closeConflictModal: () => set({ isConflictModalOpen: false }),
      
      // Sidebar actions
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      
      // Theme actions
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setDarkMode: (dark) => set({ isDarkMode: dark }),
      
      // Toast actions
      addToast: (toast) => {
        const id = Date.now().toString();
        const newToast = { ...toast, id };
        set((state) => ({ toasts: [...state.toasts, newToast] }));
        
        // Auto-remove toast after duration
        const duration = toast.duration || 5000;
        setTimeout(() => {
          get().removeToast(id);
        }, duration);
      },
      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      })),
      clearToasts: () => set({ toasts: [] }),
      
      // Loading actions
      setGlobalLoading: (loading) => set({ globalLoading: loading }),
      
      // Week navigation
      setCurrentWeek: (week) => set({ currentWeek: week }),
      goToNextWeek: () => {
        const state = get();
        const [year, week] = state.currentWeek.split('-W').map(Number);
        const nextWeek = week === 52 ? `${year + 1}-W01` : `${year}-W${String(week + 1).padStart(2, '0')}`;
        set({ currentWeek: nextWeek });
      },
      goToPreviousWeek: () => {
        const state = get();
        const [year, week] = state.currentWeek.split('-W').map(Number);
        const prevWeek = week === 1 ? `${year - 1}-W52` : `${year}-W${String(week - 1).padStart(2, '0')}`;
        set({ currentWeek: prevWeek });
      },
      goToCurrentWeek: () => set({ currentWeek: getCurrentWeek() }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        isSidebarOpen: state.isSidebarOpen,
        isDarkMode: state.isDarkMode,
        currentWeek: state.currentWeek,
      }),
    }
  )
);

// Helper function to get current week in YYYY-WW format (ISO week)
function getCurrentWeek(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}
