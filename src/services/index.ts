// Centralized API exports
export { api, apiClient } from './api';
export { aidesApi } from './aidesApi';
export { tasksApi } from './tasksApi';
export { assignmentsApi } from './assignmentsApi';
export { absencesApi } from './absencesApi';
export { classroomsApi } from './classroomsApi';
export { schoolClassesApi } from './schoolClassesApi';

// API types
export type { ApiResponse, ApiError } from './api';
export type { 
  CreateAideRequest, 
  UpdateAideRequest, 
  CreateAvailabilityRequest, 
  UpdateAvailabilityRequest 
} from './aidesApi';
export type { 
  CreateTaskRequest, 
  UpdateTaskRequest, 
  TaskFilters 
} from './tasksApi';
export type { 
  CreateAssignmentRequest, 
  UpdateAssignmentRequest, 
  BatchAssignmentRequest, 
  ConflictCheckRequest, 
  ConflictCheckResponse 
} from './assignmentsApi';
export type { 
  CreateAbsenceRequest, 
  UpdateAbsenceRequest 
} from './absencesApi';
export type { 
  CreateClassroomRequest, 
  UpdateClassroomRequest 
} from './classroomsApi';
export type { 
  CreateSchoolClassRequest, 
  UpdateSchoolClassRequest 
} from './schoolClassesApi';
