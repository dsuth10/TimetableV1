// Zustand stores for global state management
export { useAidesStore } from './stores/aidesStore';
export { useTasksStore } from './stores/tasksStore';
export { useAssignmentsStore } from './stores/assignmentsStore';
export { useAbsencesStore } from './stores/absencesStore';
export { useClassroomsStore } from './stores/classroomsStore';
export { useSchoolClassesStore } from './stores/schoolClassesStore';
export { useUIStore } from './stores/uiStore';

// Store types
export type { AidesState, AidesActions } from './stores/aidesStore';
export type { TasksState, TasksActions } from './stores/tasksStore';
export type { AssignmentsState, AssignmentsActions } from './stores/assignmentsStore';
export type { AbsencesState, AbsencesActions } from './stores/absencesStore';
export type { ClassroomsState, ClassroomsActions } from './stores/classroomsStore';
export type { SchoolClassesState, SchoolClassesActions } from './stores/schoolClassesStore';
export type { UIState, UIActions } from './stores/uiStore';

// Store initialization
export { initializeStores } from './stores/initializeStores';
