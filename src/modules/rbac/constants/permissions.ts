/**
 * RBAC Permission constants for EMS V1.
 * Permissions are global; role-permission mappings are tenant-aware via Role.tenantId.
 */

/** User management */
export const USER_CREATE = 'USER_CREATE';
export const USER_READ = 'USER_READ';
export const USER_UPDATE = 'USER_UPDATE';
export const USER_DELETE = 'USER_DELETE';

/** Role and permission management */
export const ROLE_MANAGE = 'ROLE_MANAGE';
export const PERMISSION_MANAGE = 'PERMISSION_MANAGE';

/** Tenant management (platform-only) */
export const TENANT_MANAGE = 'TENANT_MANAGE';

/** Institution */
export const INSTITUTION_MANAGE = 'INSTITUTION_MANAGE';

/** Academic structure */
export const ACADEMIC_YEAR_MANAGE = 'ACADEMIC_YEAR_MANAGE';
export const CLASS_MANAGE = 'CLASS_MANAGE';
export const SECTION_MANAGE = 'SECTION_MANAGE';

/** Students */
export const STUDENT_CREATE = 'STUDENT_CREATE';
export const STUDENT_READ = 'STUDENT_READ';
export const STUDENT_UPDATE = 'STUDENT_UPDATE';
export const STUDENT_DELETE = 'STUDENT_DELETE';
export const STUDENT_ASSIGN_CLASS = 'STUDENT_ASSIGN_CLASS';

/** Attendance */
export const ATTENDANCE_MARK = 'ATTENDANCE_MARK';
export const ATTENDANCE_READ = 'ATTENDANCE_READ';

/** Fees */
export const FEE_HEAD_MANAGE = 'FEE_HEAD_MANAGE';
export const FEE_STRUCTURE_MANAGE = 'FEE_STRUCTURE_MANAGE';
export const FEE_ASSIGN = 'FEE_ASSIGN';
export const FEE_PAY = 'FEE_PAY';
export const FEE_READ = 'FEE_READ';

/** Reports */
export const REPORT_READ = 'REPORT_READ';

/** All permission codes for seeding */
export const ALL_PERMISSIONS = [
  { code: USER_CREATE, name: 'User Create' },
  { code: USER_READ, name: 'User Read' },
  { code: USER_UPDATE, name: 'User Update' },
  { code: USER_DELETE, name: 'User Delete' },
  { code: ROLE_MANAGE, name: 'Role Manage' },
  { code: PERMISSION_MANAGE, name: 'Permission Manage' },
  { code: TENANT_MANAGE, name: 'Tenant Manage' },
  { code: INSTITUTION_MANAGE, name: 'Institution Manage' },
  { code: ACADEMIC_YEAR_MANAGE, name: 'Academic Year Manage' },
  { code: CLASS_MANAGE, name: 'Class Manage' },
  { code: SECTION_MANAGE, name: 'Section Manage' },
  { code: STUDENT_CREATE, name: 'Student Create' },
  { code: STUDENT_READ, name: 'Student Read' },
  { code: STUDENT_UPDATE, name: 'Student Update' },
  { code: STUDENT_DELETE, name: 'Student Delete' },
  { code: STUDENT_ASSIGN_CLASS, name: 'Student Assign Class' },
  { code: ATTENDANCE_MARK, name: 'Attendance Mark' },
  { code: ATTENDANCE_READ, name: 'Attendance Read' },
  { code: FEE_HEAD_MANAGE, name: 'Fee Head Manage' },
  { code: FEE_STRUCTURE_MANAGE, name: 'Fee Structure Manage' },
  { code: FEE_ASSIGN, name: 'Fee Assign' },
  { code: FEE_PAY, name: 'Fee Pay' },
  { code: FEE_READ, name: 'Fee Read' },
  { code: REPORT_READ, name: 'Report Read' },
] as const;
