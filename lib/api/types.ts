export type ApiStudent = {
  id: string;
  roleNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  motherFullname?: string | null;
  fatherFullname?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  educationLevel?: string | null;
  grade?: number | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isTransferred: boolean;
  formerSchoolName?: string | null;
  status: string;
  photoUrl?: string | null;
  admissionDate?: string | null;
  createdAt: string;
  updatedAt: string;
  enrollments?: ApiEnrollment[];
  documents?: ApiStudentDocument[];
};

export type ApiEnrollment = {
  id: string;
  status: string;
  field?: string | null;
  academicYear?: { id: string; name: string; startsOn?: string; endsOn?: string; isCurrent?: boolean } | null;
  schoolClass?: { id: string; className: string; name?: string; educationLevel?: string | null; grade?: string | null; track?: string | null } | null;
};

export type ApiStudentDocument = {
  id: string;
  documentType: string;
  objectKey: string;
  originalName: string;
  contentType: string;
  size: number;
};

export type ApiStudentGuardianLink = {
  studentId: string;
  guardianId: string;
  relationship: string;
  isPrimary: boolean;
  canPickup: boolean;
  emergencyContact: boolean;
  guardian: { id: string; guardianNumber?: string | null; firstName: string; lastName?: string | null; phone?: string | null; email?: string | null; address?: string | null };
  siblingStudents?: Array<{ id: string; firstName: string; lastName?: string | null; relationship: string }>;
};

export type ApiStudentResult = {
  id: string;
  studentId?: string;
  marks?: number | string | null;
  grade?: string | null;
  remarks?: string | null;
  status: string;
  kind: string;
  createdAt?: string;
  student?: { id: string; roleNumber?: string | null; firstName: string; lastName?: string | null } | null;
  examSubject?: {
    maxMarks?: number | string | null;
    exam?: { id: string; name: string; status: string; publishedAt?: string | null } | null;
    classSubject?: {
      schoolClass?: { id: string; className: string } | null;
      subject?: { id: string; name: string } | null;
    } | null;
  } | null;
};

export type ApiStudentAttendanceRecord = {
  id: string;
  status: string;
  markedAt?: string;
  attendanceSession: { id: string; attendanceDate: string; classId: string };
};

export type ApiPaginated<T> = { data: T[]; total: number; page: number; limit: number };

export type ApiReferenceData = {
  years: { id: string; name: string; startsOn: string; endsOn: string; isCurrent: boolean }[];
  classes: { id: string; className: string; educationLevel: string; grade: string; track?: string | null }[];
};

export type ApiUserSummary = {
  id: string;
  firstName: string;
  lastName?: string | null;
  avatarUrl?: string | null;
  status: string;
};

export type ApiSchoolClass = {
  id: string;
  className: string;
  educationLevel: string;
  grade: string;
  track?: string | null;
  classTeacherId?: string | null;
  classTeacher?: { id: string; user?: ApiUserSummary | null } | null;
  counts?: { students: number; teachers: number };
};

export type ApiSubject = {
  id: string;
  name: string;
};

export type AttendanceStatusId = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export const ATTENDANCE_STATUSES: Array<{ id: AttendanceStatusId; label: string }> = [
  { id: "PRESENT", label: "Present" },
  { id: "ABSENT", label: "Absent" },
  { id: "LATE", label: "Late" },
  { id: "EXCUSED", label: "Excused" },
];

export type StaffAttendanceStatusId = "PRESENT" | "ABSENT" | "LEAVE";

export const STAFF_ATTENDANCE_STATUSES: Array<{ id: StaffAttendanceStatusId; label: string }> = [
  { id: "PRESENT", label: "Present" },
  { id: "ABSENT", label: "Absent" },
  { id: "LEAVE", label: "Leave" },
];

export type ApiAttendanceStudent = {
  id: string;
  roleNumber?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  status?: string | null;
};

export type ApiAttendanceRecord = {
  id: string;
  attendanceSessionId?: string;
  studentId: string;
  status: string;
  remarks?: string | null;
  markedAt?: string | null;
  student?: ApiAttendanceStudent | null;
};

export type ApiAttendanceSession = {
  id: string;
  classId: string;
  subjectId?: string | null;
  teacherId?: string | null;
  attendanceDate: string;
  sessionNumber: number;
  schoolClass?: { id: string; className: string; name?: string | null } | null;
  records?: ApiAttendanceRecord[];
  _count?: { records: number } | null;
};

export type ApiStaffAttendanceEntry = {
  id: string;
  teacherId: string;
  attendanceDate: string;
  status: string;
  leftAt?: string | null;
  remarks?: string | null;
  markedById?: string | null;
  teacher?: {
    id: string;
    employeeNumber?: string | null;
    user?: { id?: string; firstName?: string | null; lastName?: string | null; phone?: string | null } | null;
  } | null;
};

export type ApiStaffMemberAttendanceEntry = {
  id: string;
  userId: string;
  attendanceDate: string;
  status: string;
  leftAt?: string | null;
  remarks?: string | null;
  markedById?: string | null;
  user?: { id?: string; firstName?: string | null; lastName?: string | null; phone?: string | null } | null;
};

export type ApiStaffDirectoryMember = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  staffNumber?: string | null;
  status?: string | null;
  position?: string | null;
  positionTitle?: string | null;
};

export type TimetableTypeId = "REGULAR" | "REVISION" | "TEST" | "EXAMINATION";

export const TIMETABLE_TYPES: Array<{ id: TimetableTypeId; label: string }> = [
  { id: "REGULAR", label: "Regular periods timetable" },
  { id: "REVISION", label: "Revision periods timetable" },
  { id: "TEST", label: "Test timetable" },
  { id: "EXAMINATION", label: "Examination timetable" },
];

export type ApiTimetableEntry = {
  id: string;
  academicYearId?: string;
  timetableType?: string;
  examName?: string | null;
  classId?: string | null;
  isBreak?: boolean;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  periodNo: number;
  room?: string | null;
  teacherId?: string | null;
  subject?: ApiSubject | null;
  teacher?: ApiTeacher | null;
  schoolClass?: { id: string; className: string; name?: string | null } | null;
};

export type StudentListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  classId?: string;
  academicYearId?: string;
  educationLevel?: string;
  grade?: number;
};

export type ApiTeacherDocument = {
  id: string;
  documentType: string;
  objectKey: string;
  originalName: string;
  contentType: string;
  size: number;
  createdAt?: string;
};

export type ApiTeacherCredential = {
  id: string;
  title: string;
  objectKey: string;
  originalName: string;
  contentType: string;
  size: number;
  source: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiTeacher = {
  id: string;
  employeeNumber?: string | null;
  hireDate?: string | null;
  specialization?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  departmentId?: string | null;
  status: string;
  user?: ApiUserSummary & { phone?: string | null; email?: string | null } | null;
  department?: { id: string; name: string } | null;
  documents?: ApiTeacherDocument[];
  credentials?: ApiTeacherCredential[];
  classSubjects?: Array<{
    id: string;
    subject?: { id: string; name: string } | null;
    schoolClass?: { id: string; className: string } | null;
  }>;
  classTeacherFor?: Array<{ id: string; className: string }>;
};

export type ApiDepartment = {
  id: string;
  name: string;
  _count?: { teachers: number } | null;
};

export type TeacherQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  departmentId?: string;
};

/**
 * Exam surfaces. Shapes mirror the Academic Affairs portal
 * (lib/api/exams.ts there) and the same backend module (src/exams). The
 * admin portal reads these shapes only — exam records, subjects, results
 * and room assignments are created and maintained in the academic portal.
 */

export type ApiAcademicYear = {
  id: string;
  tenantId?: string;
  name: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
  createdAt?: string;
  _count?: { terms: number };
  terms?: ApiAcademicTerm[];
};

export type ApiAcademicTerm = {
  id: string;
  tenantId?: string;
  academicYearId: string;
  name: string;
  startsOn: string;
  endsOn: string;
  sequenceNo: number;
};

export type ApiEnrollmentRecord = ApiEnrollment & {
  enrolledOn: string;
  student: { id: string; roleNumber: string; firstName: string; lastName?: string | null };
};

export type ApiClassSubject = {
  id: string;
  tenantId?: string;
  classId: string;
  subjectId: string;
  teacherId?: string | null;
  schoolClass?: { id: string; className: string } | null;
  subject?: ApiSubject;
  teacher?: { id: string; user?: ApiUserSummary | null } | null;
};

export type ApiExamType = {
  id: string;
  tenantId?: string;
  name: string;
  defaultWeight?: number | string | null;
};

export type ApiHall = {
  id: string;
  tenantId?: string;
  name: string;
  capacity: number;
  type: "PHYSICAL" | "VIRTUAL";
};

export type ApiExamSubject = {
  id: string;
  tenantId?: string;
  examId: string;
  classSubjectId: string;
  examDate?: string | null;
  maxMarks: number | string;
  passingMarks?: number | string | null;
  weight?: number | string | null;
  gradingScaleId?: string | null;
  classSubject?: ApiClassSubject | null;
  gradingScale?: ApiGradingScale | null;
  results?: ApiStudentResult[];
};

export type ApiExam = {
  id: string;
  tenantId?: string;
  academicYearId: string;
  termId?: string | null;
  examTypeId?: string | null;
  name: string;
  startsOn?: string | null;
  endsOn?: string | null;
  status: string;
  publishedAt?: string | null;
  sampleObjectKey?: string | null;
  authorId?: string | null;
  examGroupId?: string | null;
  examType?: ApiExamType | null;
  author?: { id: string; firstName: string; lastName?: string | null } | null;
  examSubjects?: ApiExamSubject[];
  examRoomAssignments?: ApiRoomAssignment[];
  _count?: { examSubjects?: number; examRoomAssignments?: number };
};

export type ApiRoomStudent = {
  id: string;
  studentId: string;
  seatOrder: number;
  student?: {
    id: string;
    roleNumber?: string | null;
    firstName: string;
    lastName?: string | null;
    gender?: string | null;
  } | null;
};

export type ApiRoomInvigilator = {
  id: string;
  teacherId: string;
  teacher?: ApiTeacher | null;
};

export type ApiRoomAssignment = {
  id: string;
  examId: string;
  hallId: string;
  hall?: ApiHall | null;
  invigilators?: ApiRoomInvigilator[];
  students?: ApiRoomStudent[];
  _count?: { students?: number; invigilators?: number };
};

export type ApiGradingBand = {
  id?: string;
  minPercent: number | string;
  maxPercent: number | string;
  grade: string;
  points?: number | null;
  remark?: string | null;
};

export type ApiGradingScale = {
  id: string;
  tenantId?: string;
  name: string;
  isDefault?: boolean;
  bands?: ApiGradingBand[];
};

export type ApiTimetableSlot = {
  id: string;
  tenantId?: string;
  examSubjectId: string;
  hallId?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  examSubject?: (ApiExamSubject & {
    classSubject?: ApiClassSubject | null;
  }) | null;
  hall?: ApiHall | null;
  invigilationDuties?: ApiInvigilationDuty[];
  seatAssignments?: ApiSeatAssignment[];
  _count?: { seatAssignments: number };
};

export type ApiSeatAssignment = {
  id: string;
  tenantId?: string;
  examTimetableSlotId: string;
  studentId: string;
  hallId: string;
  seatNumber: string;
  student?: { id: string; roleNumber?: string | null; firstName: string; lastName?: string | null } | null;
  hall?: ApiHall | null;
};

export type ApiInvigilationDuty = {
  id: string;
  tenantId?: string;
  examTimetableSlotId: string;
  teacherId: string;
  hallId: string;
  teacher?: ApiTeacher | null;
  hall?: ApiHall | null;
};

/** The school administrator's own workspace: person, school, plan, positions. */
export interface ApiSchoolAdminOverview {
  admin: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
    staffNumber: string | null;
    status: string;
    lastLoginAt: string | null;
    role: "SCHOOL_ADMIN";
  };
  tenant: {
    id: string;
    name: string;
    nameAr: string | null;
    email: string | null;
    phone: string | null;
    logoUrl: string | null;
    websiteUrl: string | null;
    countryCode: string | null;
    currencyCode: string;
    timezone: string;
    weekendDays: string[];
    status: string;
    createdAt: string;
  };
  subscription: {
    id: string;
    tier: string;
    tierName: string;
    tierLabel: string | null;
    status: string;
    subscriptionStatus:
      | "ACTIVE"
      | "EXPIRING_SOON"
      | "EXPIRED"
      | "LOCKED"
      | "NO_SUBSCRIPTION";
    startedAt: string;
    expiresAt: string | null;
    daysRemaining: number | null;
    durationDays: number;
    studentCount: number;
    /** The yearly rate the school pays. */
    yearlyPrice: number;
    /** The monthly equivalent of the yearly rate. */
    monthlyPrice: number;
    currency: string;
    portals: string[];
  } | null;
  portals: Array<{ portal: string; unlocked: boolean }>;
  allowedPositions: Array<{ position: string; label: string }>;
  positions: ApiSchoolPosition[];
  /** The tiers a school could ask to move to. */
  upgrades: Array<{
    id: string;
    code: string;
    name: string;
    tier: string;
    yearlyPrice: number;
    monthlyPrice: number;
    currency: string;
    durationDays: number;
    portals: string[];
  }>;
}

export interface ApiSchoolPosition {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  portal: string | null;
  isSystemRole: boolean;
  members: number;
}

export interface ApiTenantUpdateInput {
  name?: string;
  nameAr?: string | null;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  countryCode?: string | null;
  currencyCode?: string;
  timezone?: string;
}
