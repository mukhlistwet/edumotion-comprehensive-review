export const QUESTION_TYPES = Object.freeze([
  'single_choice',
  'multiple_select',
  'true_false',
  'numeric',
  'short_text',
  'fill_blank',
  'matching',
  'ordering',
  'drag_drop',
  'graph_plot',
  'formula_input',
  'diagram_label',
  'simulation',
  'worked_solution'
]);

export const QUESTION_TYPE_LABELS = Object.freeze({
  single_choice: 'Pilihan Tunggal',
  multiple_select: 'Multi-Select',
  true_false: 'Benar / Salah',
  numeric: 'Jawaban Angka',
  short_text: 'Isian Singkat',
  fill_blank: 'Isi Bagian Kosong',
  matching: 'Menjodohkan',
  ordering: 'Urutkan Langkah',
  drag_drop: 'Seret & Letakkan',
  graph_plot: 'Plot Grafik',
  formula_input: 'Input Rumus',
  diagram_label: 'Label Diagram',
  simulation: 'Simulasi Fisika',
  worked_solution: 'Uraian Solusi'
});

export const DIFFICULTY_LEVELS = Object.freeze([
  'very_easy',
  'easy',
  'medium',
  'hard',
  'very_hard'
]);

export const BLOOM_LEVELS = Object.freeze([
  'remember',
  'understand',
  'apply',
  'analyze',
  'evaluate',
  'create'
]);

export const ASSESSMENT_MODES = Object.freeze([
  'practice',
  'challenge',
  'tryout',
  'formal_exam'
]);

export const CHAPTER_STATUSES = Object.freeze([
  'planned',
  'available',
  'in_progress',
  'completed',
  'archived'
]);

export const JOURNEY_NODE_STATUSES = Object.freeze([
  'locked',
  'available',
  'in_progress',
  'completed'
]);

export const JOURNEY_NODE_KINDS = Object.freeze([
  'lesson',
  'practice',
  'challenge',
  'simulation',
  'assessment',
  'boss',
  'milestone'
]);

export const JOURNEY_TEMPLATE_IDS = Object.freeze([
  'adventure',
  'board',
  'explore',
  'skill',
  'racing',
  'galaxy'
]);

export const JOURNEY_SELECTION_MODES = Object.freeze([
  'adaptive',
  'personal',
  'random',
  'admin'
]);

export const QUESTION_GOVERNANCE_STATUSES = Object.freeze([
  'draft',
  'validation_failed',
  'in_review',
  'approved',
  'published',
  'archived'
]);

export const AI_GENERATION_ITEM_STATUSES = Object.freeze([
  'queued',
  'generating',
  'validating',
  'needs_review',
  'accepted',
  'rejected',
  'failed'
]);

export const ASSESSMENT_SESSION_STATUSES = Object.freeze([
  'created',
  'started',
  'submitted',
  'grading',
  'graded',
  'expired',
  'cancelled',
  'invalidated'
]);

export const EDUCATION_LEVELS = Object.freeze([
  'SD',
  'SMP',
  'SMA',
  'UNIVERSITY'
]);

export const ROLES = Object.freeze({
  STUDENT: 'student',
  PARENT: 'parent',
  TEACHER: 'teacher',
  HOMEROOM_TEACHER: 'homeroom_teacher',
  COUNSELOR: 'counselor',
  CONTENT_AUTHOR: 'content_author',
  REVIEWER: 'reviewer',
  PUBLISHER: 'publisher',
  SCHOOL_ACADEMIC_ADMIN: 'school_academic_admin',
  VICE_PRINCIPAL: 'vice_principal',
  PRINCIPAL: 'principal',
  SCHOOL_OWNER: 'school_owner',
  PLATFORM_CURRICULUM_ADMIN: 'platform_curriculum_admin',
  PLATFORM_SUPER_ADMIN: 'platform_super_admin'
});

export const PERMISSIONS = Object.freeze({
  STUDENT_LEARN: 'student.learn',
  STUDENT_ASSESSMENT: 'student.assessment',
  PARENT_VIEW_LINKED: 'parent.view_linked_child',
  QUESTION_READ: 'question.read',
  QUESTION_CREATE_DRAFT: 'question.create_draft',
  QUESTION_EDIT_DRAFT: 'question.edit_draft',
  QUESTION_REVIEW: 'question.review',
  QUESTION_PUBLISH: 'question.publish',
  QUESTION_ARCHIVE: 'question.archive',
  AI_GENERATE: 'ai.generate',
  SCHOOL_VIEW_DASHBOARD: 'school.view_dashboard',
  SCHOOL_MANAGE_STUDENTS: 'school.manage_students',
  SCHOOL_MANAGE_STAFF: 'school.manage_staff',
  SCHOOL_MANAGE_CLASSES: 'school.manage_classes',
  SCHOOL_MANAGE_SUBJECTS: 'school.manage_subjects',
  SCHOOL_MANAGE_CALENDAR: 'school.manage_calendar',
  SCHOOL_GRADE_ASSESSMENT: 'school.grade_assessment',
  SCHOOL_VIEW_REPORTS: 'school.view_reports',
  SCHOOL_COUNSELING_ACCESS: 'school.counseling_access',
  SCHOOL_MANAGE_ROLES: 'school.manage_roles',
  SCHOOL_MANAGE_SETTINGS: 'school.manage_settings',
  PLATFORM_VIEW_OVERVIEW: 'platform.view_overview',
  PLATFORM_MANAGE_INSTITUTIONS: 'platform.manage_institutions',
  PLATFORM_MANAGE_USERS: 'platform.manage_users',
  PLATFORM_MANAGE_CURRICULA: 'platform.manage_curricula',
  PLATFORM_MANAGE_GLOBAL_QUESTIONS: 'platform.manage_global_questions',
  PLATFORM_MANAGE_JOURNEY_TEMPLATES: 'platform.manage_journey_templates',
  PLATFORM_MANAGE_BILLING: 'platform.manage_billing',
  PLATFORM_MONITOR_AI: 'platform.monitor_ai',
  PLATFORM_MANAGE_ROLES: 'platform.manage_roles',
  PLATFORM_VIEW_AUDIT_LOGS: 'platform.view_audit_logs',
  PLATFORM_MANAGE_SETTINGS: 'platform.manage_settings'
});

export const ENTITLEMENTS = Object.freeze({
  FREEMIUM: 'freemium',
  PREMIUM: 'premium',
  FAMILY: 'family',
  INSTITUTION_BASIC: 'institution_basic',
  INSTITUTION_PRO: 'institution_pro'
});
