import { PERMISSIONS, ROLES } from './enums.js';

export const DEFAULT_ROLE_PERMISSION_MAP = Object.freeze({
  [ROLES.STUDENT]: [
    PERMISSIONS.STUDENT_LEARN,
    PERMISSIONS.STUDENT_ASSESSMENT
  ],
  [ROLES.PARENT]: [
    PERMISSIONS.PARENT_VIEW_LINKED
  ],
  [ROLES.TEACHER]: [
    PERMISSIONS.QUESTION_READ,
    PERMISSIONS.QUESTION_CREATE_DRAFT,
    PERMISSIONS.QUESTION_EDIT_DRAFT,
    PERMISSIONS.AI_GENERATE,
    PERMISSIONS.SCHOOL_VIEW_DASHBOARD,
    PERMISSIONS.SCHOOL_MANAGE_SUBJECTS,
    PERMISSIONS.SCHOOL_GRADE_ASSESSMENT,
    PERMISSIONS.SCHOOL_VIEW_REPORTS
  ],
  [ROLES.HOMEROOM_TEACHER]: [
    PERMISSIONS.SCHOOL_VIEW_DASHBOARD,
    PERMISSIONS.SCHOOL_MANAGE_CLASSES,
    PERMISSIONS.SCHOOL_VIEW_REPORTS,
    PERMISSIONS.SCHOOL_COUNSELING_ACCESS
  ],
  [ROLES.COUNSELOR]: [
    PERMISSIONS.SCHOOL_VIEW_DASHBOARD,
    PERMISSIONS.SCHOOL_COUNSELING_ACCESS
  ],
  [ROLES.CONTENT_AUTHOR]: [
    PERMISSIONS.QUESTION_READ,
    PERMISSIONS.QUESTION_CREATE_DRAFT,
    PERMISSIONS.QUESTION_EDIT_DRAFT,
    PERMISSIONS.AI_GENERATE
  ],
  [ROLES.REVIEWER]: [
    PERMISSIONS.QUESTION_READ,
    PERMISSIONS.QUESTION_REVIEW
  ],
  [ROLES.PUBLISHER]: [
    PERMISSIONS.QUESTION_READ,
    PERMISSIONS.QUESTION_PUBLISH,
    PERMISSIONS.QUESTION_ARCHIVE
  ],
  [ROLES.SCHOOL_ACADEMIC_ADMIN]: [
    PERMISSIONS.SCHOOL_VIEW_DASHBOARD,
    PERMISSIONS.SCHOOL_MANAGE_STUDENTS,
    PERMISSIONS.SCHOOL_MANAGE_STAFF,
    PERMISSIONS.SCHOOL_MANAGE_CLASSES,
    PERMISSIONS.SCHOOL_MANAGE_SUBJECTS,
    PERMISSIONS.SCHOOL_MANAGE_CALENDAR,
    PERMISSIONS.SCHOOL_VIEW_REPORTS,
    PERMISSIONS.SCHOOL_MANAGE_ROLES
  ],
  [ROLES.VICE_PRINCIPAL]: [
    PERMISSIONS.SCHOOL_VIEW_DASHBOARD,
    PERMISSIONS.SCHOOL_MANAGE_CLASSES,
    PERMISSIONS.SCHOOL_MANAGE_SUBJECTS,
    PERMISSIONS.SCHOOL_MANAGE_CALENDAR,
    PERMISSIONS.SCHOOL_GRADE_ASSESSMENT,
    PERMISSIONS.SCHOOL_VIEW_REPORTS
  ],
  [ROLES.PRINCIPAL]: [
    PERMISSIONS.SCHOOL_VIEW_DASHBOARD,
    PERMISSIONS.SCHOOL_VIEW_REPORTS,
    PERMISSIONS.SCHOOL_COUNSELING_ACCESS,
    PERMISSIONS.SCHOOL_MANAGE_SETTINGS
  ],
  [ROLES.SCHOOL_OWNER]: [
    PERMISSIONS.SCHOOL_VIEW_DASHBOARD,
    PERMISSIONS.SCHOOL_MANAGE_STUDENTS,
    PERMISSIONS.SCHOOL_MANAGE_STAFF,
    PERMISSIONS.SCHOOL_MANAGE_CLASSES,
    PERMISSIONS.SCHOOL_MANAGE_SUBJECTS,
    PERMISSIONS.SCHOOL_MANAGE_CALENDAR,
    PERMISSIONS.SCHOOL_GRADE_ASSESSMENT,
    PERMISSIONS.SCHOOL_VIEW_REPORTS,
    PERMISSIONS.SCHOOL_MANAGE_ROLES,
    PERMISSIONS.SCHOOL_MANAGE_SETTINGS
  ],
  [ROLES.PLATFORM_CURRICULUM_ADMIN]: [
    PERMISSIONS.QUESTION_READ,
    PERMISSIONS.QUESTION_CREATE_DRAFT,
    PERMISSIONS.QUESTION_EDIT_DRAFT,
    PERMISSIONS.QUESTION_REVIEW,
    PERMISSIONS.QUESTION_PUBLISH,
    PERMISSIONS.AI_GENERATE,
    PERMISSIONS.PLATFORM_VIEW_OVERVIEW,
    PERMISSIONS.PLATFORM_MANAGE_CURRICULA,
    PERMISSIONS.PLATFORM_MANAGE_GLOBAL_QUESTIONS,
    PERMISSIONS.PLATFORM_MANAGE_JOURNEY_TEMPLATES
  ],
  [ROLES.PLATFORM_SUPER_ADMIN]: Object.values(PERMISSIONS)
});

export function getUserPermissions(user, customSchoolRoles = []) {
  if (!user) return [];
  const base = DEFAULT_ROLE_PERMISSION_MAP[user.role] || [];
  const explicit = user.permissions || [];
  const customRolePerms = (user.customRoleIds || []).flatMap((rid) => {
    const found = customSchoolRoles.find((r) => r.id === rid && r.tenantId === user.tenantId);
    return found ? found.permissions || [] : [];
  });
  return Array.from(new Set([...base, ...explicit, ...customRolePerms]));
}

export function hasPermission(user, permission, customSchoolRoles = []) {
  if (!user || !permission) return false;
  return getUserPermissions(user, customSchoolRoles).includes(permission);
}

export function canAccessTenantResource(user, resourceTenantId, options = {}) {
  if (!user) return false;
  if (user.role === ROLES.PLATFORM_SUPER_ADMIN && options.allowPlatformCrossTenant) {
    return true;
  }
  if (!resourceTenantId) {
    // Global bank resource readable by platform curriculum/super admin or authorized authors
    return (
      user.role === ROLES.PLATFORM_CURRICULUM_ADMIN ||
      user.role === ROLES.PLATFORM_SUPER_ADMIN ||
      Boolean(options.allowGlobalRead)
    );
  }
  return Boolean(user.tenantId) && user.tenantId === resourceTenantId;
}

export function canAccessClassResource(user, classId) {
  if (!user) return false;
  if (
    [ROLES.PRINCIPAL, ROLES.SCHOOL_OWNER, ROLES.VICE_PRINCIPAL, ROLES.SCHOOL_ACADEMIC_ADMIN].includes(
      user.role
    )
  ) {
    return true;
  }
  const assigned = user.assignedClassIds || [];
  return assigned.includes(classId);
}

export function canAccessLinkedStudent(user, studentId) {
  if (!user) return false;
  if (user.role === ROLES.STUDENT) return user.id === studentId;
  if (user.role === ROLES.PARENT) {
    return (user.linkedStudentIds || []).includes(studentId);
  }
  return false;
}
