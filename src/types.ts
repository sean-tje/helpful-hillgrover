export type UserRole = 'Committee Teacher' | 'Programme IC' | 'Committee Chair';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isChair: boolean;
  active: boolean;
  authorised: boolean;
  department?: string;
  createdAt: string;
}

export type ProgrammeType = 'Camp' | 'Investiture' | 'Exchange' | 'Training' | 'School Event';

export type ProgrammeStatus = 'Draft' | 'Planning' | 'Ready' | 'Completed' | 'Archived';

export interface ConditionalAnswers {
  isTransportRequired: boolean;
  isOffSite: boolean;
  isOutsideNormalHours: boolean;
  involvesPhysicalActivities: boolean;
  involvesParentsOrGuardians: boolean;
  areMealsRequired: boolean;
  areExternalVendorsInvolved: boolean;
  isRehearsalRequired: boolean;
  areVisitorsEnteringSchool: boolean;
  areEquipmentOrPurchasesRequired: boolean;
}

export interface Programme {
  id: string;
  title: string;
  type: ProgrammeType;
  description: string;
  objectives: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  venue: string;
  status: ProgrammeStatus;
  term?: 'Term 1' | 'Term 2' | 'Term 3' | 'Term 4';
  firstIcId: string;
  secondIcId?: string;
  thirdIcId?: string;
  supportingTeacherIds: string[];
  isAllHands?: boolean;
  sourceProgrammeId?: string; // Reference to duplicated previous programme
  conditionalAnswers: ConditionalAnswers;
  createdBy: string;
  createdAt: string;
  archivedAt?: string;
  archivedBy?: string;
  reflection?: {
    whatWorked: string;
    challenges: string;
    suggestions: string;
    submittedBy: string;
    submittedAt: string;
  };
}

export type TaskStatus = 'Not Started' | 'In Progress' | 'Awaiting Input' | 'Completed';

export interface TaskHandover {
  id: string;
  taskId: string;
  fromUserId: string;
  toUserId: string;
  note?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  programmeId: string;
  title: string;
  notes?: string;
  ownerId: string;
  assignedTo?: string;
  previousOwnerIds: string[];
  dueDate: string; // YYYY-MM-DD
  status: TaskStatus;
  requestedInputFromId?: string;
  source: 'manually_created' | 'ai_proposed_approved' | 'ai_suggested';
  approvedBy?: string;
  completedBy?: string;
  completedAt?: string;
  createdAt: string;
  handovers: TaskHandover[];
  dependencyTaskId?: string;
}

export type DocumentCategory = 
  | 'Programme Proposals' 
  | 'RAMS' 
  | 'Parents Gateway Letters' 
  | 'Student Instructions' 
  | 'All-Staff Notifications' 
  | 'Reflection Questions' 
  | 'Publicity & Social'
  | 'Reports' 
  | 'SOPs' 
  | 'VMV' 
  | 'Corporate Slides' 
  | 'Approved Templates' 
  | 'Other';

export type DocumentStatus = 'Current' | 'Approved' | 'Historical' | 'Superseded' | 'Example';

export interface Document {
  id: string;
  title: string;
  filePath: string;
  fileType: 'docx' | 'pdf' | 'pptx' | 'xlsx' | 'gdoc' | 'gslides';
  category: DocumentCategory;
  year: number;
  programmeType?: ProgrammeType | 'General';
  status: DocumentStatus;
  ownerId: string;
  tags: string[];
  templateFlag: boolean;
  uploadedBy: string;
  uploadedAt: string;
  supersedesDocumentId?: string;
  indexingStatus: 'Uploaded' | 'Indexing' | 'Searchable' | 'Index failed' | 'Superseded' | 'Removed';
  fileSize?: string;
  excerpt?: string;
  programmeId?: string;
}

export interface ProgrammeDocument {
  id: string;
  programmeId: string;
  documentId: string;
  purpose: string;
  required: boolean;
  currentVersion: number;
  finalVersion?: number;
}

export interface GeneratedDocument {
  id: string;
  programmeId: string;
  outputType: 'RAMS' | 'All-staff notification' | 'Parents Gateway draft' | 'Student instructions' | 'Reflection questions' | 'Programme overview' | 'Bus-booking info';
  templateDocumentId?: string;
  sourceProgrammeId?: string;
  content: string; // Markdown or formatted text
  filePath?: string;
  version: number;
  status: 'Draft' | 'Final' | 'Superseded';
  missingFields?: string[];
  generatedAt: string;
  generatedBy: string;
}

export interface ChecklistItem {
  id: string;
  programmeId: string;
  key: string;
  label: string;
  required: boolean;
  sourceRule: 'Universal Core' | 'Type Specific' | 'Conditional Trigger';
  status: 'Pending' | 'Completed' | 'Waived';
  relatedDocumentId?: string;
  relatedTaskId?: string;
}

export interface CalendarItem {
  id: string;
  programmeId: string;
  taskId?: string;
  type: 'programme_event' | 'task_due' | 'planning_deadline';
  title: string;
  start: string; // YYYY-MM-DD
  end?: string; // YYYY-MM-DD
  dueDate?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'task_assigned' | 'task_due_soon' | 'task_overdue' | 'input_requested' | 'required_doc_missing';
  title: string;
  message: string;
  targetType: 'programme' | 'task' | 'document';
  targetId: string;
  readAt?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface AISearchRecord {
  id: string;
  userId: string;
  query: string;
  sourceDocumentIds: string[];
  answer: string;
  citations: Array<{ documentId: string; title: string; excerpt: string; status: DocumentStatus }>;
  createdAt: string;
}

export interface YearEndInsight {
  id: string;
  year?: number;
  academicYear?: number;
  category?: string; // e.g., "Repeatedly late task types", "Workload distribution"
  statement?: string;
  evidence?: string;
  status?: 'Proposed' | 'Reviewed' | 'Dismissed';
  reviewedBy?: string;
  createdAt?: string;
  totalProgrammes?: number;
  programmesArchived?: number;
  totalTasks?: number;
  tasksCompleted?: number;
  handoversLogged?: number;
  aiProposalsAccepted?: number;
  bottlenecksIdentified?: string[];
  recommendationsForNextYear?: string[];
  generatedAt?: string;
}

export interface AuditRecord {
  id: string;
  userId: string;
  action: 'programme_created' | 'programme_updated' | 'task_approved' | 'task_completed' | 'task_reopened' | 'document_status_changed' | 'programme_archived' | 'document_generated';
  details: string;
  targetId: string;
  createdAt: string;
}

export interface BusBookingData {
  eventTitle: string;
  date: string;
  reportingTime: string;
  dismissalTime: string;
  destination: string;
  pickupPoint: string;
  estimatedPassengers: number;
  contactTeacherName: string;
  contactTeacherPhone: string;
  purpose: string;
  specialRequests?: string;
}

// Fields of the school's Parents Gateway letter template (templates/PG_Template.docx)
export interface PgLetterFields {
  year: string;
  referenceNumber: string;
  letterDate: string;
  subject: string;
  eventName: string;
  eventDate: string;
  reportingTime: string;
  reportingVenue: string;
  dismissalTime: string;
  dismissalVenue: string;
  attire: string;
  transportation: string; // Empty removes the Transportation row
  objectives: string[];
  contactTeachers: string; // Empty means "contact the school"
}
