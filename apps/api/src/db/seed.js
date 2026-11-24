import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_TEMPLATE_CATALOG } from '@edumotion/domain';
import { hashPassword } from '../security/password.js';
import { createDbPool } from './pool.js';
import { runMigrations } from './migrate.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../../../..');
const fixturesDir = path.join(repoRoot, 'packages/services/src/fixtures/v1');

function readFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, name), 'utf8'));
}

export async function seedDatabase(db, { demoPassword = process.env.DEMO_SEED_PASSWORD || 'edumotion-demo' } = {}) {
  const curriculaTax = readFixture('curricula-taxonomy.json');
  const personasTenants = readFixture('personas-users-tenants.json');
  const learningJourneys = readFixture('learning-paths-journeys.json');
  const questionsBank = readFixture('questions-bank.json');
  const activitiesAsm = readFixture('activities-assessments.json');
  const masteryGam = readFixture('mastery-gamification.json');
  const aiRuns = readFixture('ai-generation-runs.json');
  const schoolAdmin = readFixture('school-platform-admin.json');

  const demoPasswordHash = hashPassword(demoPassword);

  await db.transaction(async (tx) => {
    // 1. Tenants
    for (const t of personasTenants.tenants) {
      await tx.query(
        `INSERT INTO tenants (id, name, type, city, plan, status, user_count, ai_monthly_budget_usd, ai_spent_usd, academic_year)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
        [t.id, t.name, t.type, t.city, t.plan, t.status, t.userCount, t.aiMonthlyBudgetUsd, t.aiSpentUsd, t.academicYear]
      );
    }

    // 2. Taxonomy
    for (const c of curriculaTax.curricula) {
      await tx.query(
        `INSERT INTO curricula (id, code, name, status) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
        [c.id, c.code, c.name, c.status]
      );
      for (const v of c.versions || []) {
        await tx.query(
          `INSERT INTO curriculum_versions (id, curriculum_id, version, effective_from, status) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
          [v.id, c.id, v.version, v.effectiveFrom, v.status]
        );
      }
    }
    for (const g of curriculaTax.gradeLevels) {
      await tx.query(
        `INSERT INTO grade_levels (id, education_level, grade_code, display_name) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
        [g.id, g.educationLevel, g.gradeCode, g.displayName]
      );
    }
    for (const s of curriculaTax.subjects) {
      await tx.query(
        `INSERT INTO subjects (id, code, name, description) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
        [s.id, s.code, s.name, s.description]
      );
    }
    for (const top of curriculaTax.topics) {
      await tx.query(
        `INSERT INTO topics (id, subject_id, parent_id, code, name) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [top.id, top.subjectId, top.parentId || null, top.code, top.name]
      );
    }
    for (const comp of curriculaTax.competencies) {
      await tx.query(
        `INSERT INTO competencies (id, topic_id, code, description) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
        [comp.id, comp.topicId, comp.code, comp.description]
      );
    }

    // 3. Users & Parent Links
    for (const u of personasTenants.personas) {
      await tx.query(
        `INSERT INTO users (
          id, email, password_hash, display_name, initials, role, tenant_id, education_level,
          curriculum_id, grade_level_id, class_id, entitlement, is_minor, privacy_opt_in_public_name,
          assigned_class_ids, assigned_subject_ids, permissions, custom_role_ids, title, description
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17::jsonb,$18::jsonb,$19,$20)
        ON CONFLICT (id) DO NOTHING`,
        [
          u.id,
          u.email,
          demoPasswordHash,
          u.displayName,
          u.initials,
          u.role,
          u.tenantId || null,
          u.educationLevel || null,
          u.curriculumId || 'cur_merdeka',
          u.gradeLevelId || null,
          u.classId || null,
          u.entitlement || 'freemium',
          Boolean(u.isMinor),
          Boolean(u.privacyOptInPublicName),
          JSON.stringify(u.assignedClassIds || []),
          JSON.stringify(u.assignedSubjectIds || []),
          JSON.stringify(u.permissions || []),
          JSON.stringify(u.customRoleIds || []),
          u.title || null,
          u.description || null
        ]
      );
    }
    for (const u of personasTenants.personas) {
      if (Array.isArray(u.linkedStudentIds)) {
        for (const sid of u.linkedStudentIds) {
          await tx.query(
            `INSERT INTO parent_student_links (parent_user_id, student_user_id, relationship)
             VALUES ($1,$2,'parent') ON CONFLICT (parent_user_id, student_user_id) DO NOTHING`,
            [u.id, sid]
          );
        }
      }
    }

    // 4. School Classes, Students, Calendar, Worked Submissions, Counseling & Custom Roles
    for (const cls of schoolAdmin.school.classes) {
      await tx.query(
        `INSERT INTO school_classes (id, tenant_id, name, grade, homeroom_teacher, student_count, active_count, avg_mastery)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [cls.id, cls.tenantId, cls.name, cls.grade, cls.homeroomTeacher, cls.studentCount, cls.activeCount, cls.avgMastery]
      );
    }
    for (const stu of schoolAdmin.school.students) {
      await tx.query(
        `INSERT INTO school_students (id, tenant_id, class_id, name, nis, avg_mastery, xp, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [stu.id, stu.tenantId, stu.classId, stu.name, stu.nis, stu.avgMastery, stu.xp, stu.status]
      );
    }
    for (const ev of schoolAdmin.school.calendarEvents) {
      await tx.query(
        `INSERT INTO school_calendar_events (id, tenant_id, event_date, event_time, title, scope_label, tone)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [ev.id, ev.tenantId, ev.date, ev.time, ev.title, ev.scopeLabel, ev.tone]
      );
    }
    for (const ws of schoolAdmin.school.workedSubmissions) {
      await tx.query(
        `INSERT INTO worked_solution_submissions (id, tenant_id, class_id, student_id, student_name, assessment_title, question_id, question_stem, student_answer, rubric_json, status, awarded_scores_json, reviewer_note)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12::jsonb,$13) ON CONFLICT (id) DO NOTHING`,
        [
          ws.id, ws.tenantId, ws.classId, ws.studentId, ws.studentName, ws.assessmentTitle,
          ws.questionId, ws.questionStem, ws.studentAnswer, JSON.stringify(ws.rubric),
          ws.status, ws.awardedScores ? JSON.stringify(ws.awardedScores) : null, ws.reviewerNote || ''
        ]
      );
    }
    for (const sig of schoolAdmin.school.counselingSignals) {
      await tx.query(
        `INSERT INTO counseling_signals (id, tenant_id, class_id, student_id, student_name, risk_level, signal, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [sig.id, sig.tenantId, sig.classId, sig.studentId, sig.studentName, sig.riskLevel, sig.signal, sig.status]
      );
    }
    for (const cr of schoolAdmin.school.customRoles) {
      await tx.query(
        `INSERT INTO school_custom_roles (id, tenant_id, name, permissions)
         VALUES ($1,$2,$3,$4::jsonb) ON CONFLICT (id) DO NOTHING`,
        [cr.id, cr.tenantId, cr.name, JSON.stringify(cr.permissions)]
      );
    }

    // 5. Journey Template Catalog & Achievements & Quests
    for (const tpl of DEFAULT_TEMPLATE_CATALOG) {
      await tx.query(
        `INSERT INTO journey_template_catalog (id, version, name, base, enabled, priority_weight, config_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT (id) DO NOTHING`,
        [tpl.id, tpl.version, tpl.name, Boolean(tpl.base), Boolean(tpl.enabled), Number(tpl.priorityWeight || 0), JSON.stringify(tpl)]
      );
    }
    for (const ach of masteryGam.achievements) {
      await tx.query(
        `INSERT INTO achievements (id, title, description, icon, reward_xp, unlocks_template_id)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [ach.id, ach.title, ach.description, ach.icon, ach.rewardXp, ach.unlocksTemplateId || null]
      );
    }
    const seedAchUsers = {
      usr_student_smp_free: ['ach_first_step'],
      usr_student_sma_prem: ['ach_first_step', 'ach_chapter_explorer', 'ach_speed_streak', 'ach_physics_voyager'],
      usr_student_sd_family: ['ach_first_step'],
      usr_student_univ: ['ach_first_step', 'ach_chapter_explorer']
    };
    for (const [uid, achIds] of Object.entries(seedAchUsers)) {
      for (const aid of achIds) {
        await tx.query(
          `INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1,$2) ON CONFLICT (user_id, achievement_id) DO NOTHING`,
          [uid, aid]
        );
      }
    }
    for (const qst of masteryGam.quests) {
      await tx.query(
        `INSERT INTO quests (id, cadence, title, target_count, progress_count, reward_xp, reward_gems)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [qst.id, qst.cadence, qst.title, qst.targetCount, qst.progressCount, qst.rewardXp, qst.rewardGems]
      );
      if (qst.claimed) {
        await tx.query(
          `INSERT INTO user_quest_claims (user_id, quest_id) VALUES ('usr_student_smp_free', $1) ON CONFLICT (user_id, quest_id) DO NOTHING`,
          [qst.id]
        );
      }
    }

    // 6. Questions & Activities & Learning Paths & Chapters & Nodes
    for (const q of questionsBank.questions) {
      await tx.query(
        `INSERT INTO questions (id, tenant_id, owner_id, current_version, status)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [q.id, q.governance?.tenantId || null, q.governance?.createdBy || null, q.version, q.governance?.status || 'draft']
      );
      await tx.query(
        `INSERT INTO question_versions (
          id, question_id, version, schema_version, type, tenant_id, governance_status, visibility, payload_json, published_at, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11) ON CONFLICT (question_id, version) DO NOTHING`,
        [
          `${q.id}_v${q.version}`,
          q.id,
          q.version,
          q.schemaVersion || 'edumotion-question-v1',
          q.type,
          q.governance?.tenantId || null,
          q.governance?.status || 'draft',
          q.delivery?.visibility || 'tenant',
          JSON.stringify(q),
          q.governance?.publishedAt || null,
          q.governance?.createdBy || null
        ]
      );
    }

    for (const act of activitiesAsm.activities) {
      await tx.query(
        `INSERT INTO activities (id, type, title, subject_id, mode, estimated_minutes, xp_reward, hearts_enabled, policy_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) ON CONFLICT (id) DO NOTHING`,
        [act.id, act.type, act.title, act.subjectId, act.mode, act.estimatedMinutes, act.xpReward, Boolean(act.heartsEnabled), JSON.stringify({ questionIds: act.questionIds })]
      );
      for (let i = 0; i < act.questionIds.length; i += 1) {
        await tx.query(
          `INSERT INTO activity_question_mappings (activity_id, question_id, question_version, sequence)
           VALUES ($1,$2,1,$3) ON CONFLICT (activity_id, question_id, question_version) DO NOTHING`,
          [act.id, act.questionIds[i], i + 1]
        );
      }
    }

    for (const lp of learningJourneys.learningPaths) {
      await tx.query(
        `INSERT INTO learning_paths (id, journey_id, subject_id, subject_code, curriculum_id, curriculum_version_id, grade_level_id, education_level, title, description, version, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
        [lp.id, lp.journeyId, lp.subjectId, lp.subjectCode, lp.curriculumId, lp.curriculumVersionId, lp.gradeLevelId, lp.educationLevel, lp.title, lp.description, lp.version, lp.status]
      );
    }
    for (const ch of learningJourneys.chapters) {
      await tx.query(
        `INSERT INTO journey_chapters (id, journey_id, path_id, sequence, title, subject_code, education_level, dominant_activity_kind, status, started_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
        [ch.id, ch.journeyId, ch.pathId, ch.sequence, ch.title, ch.subjectCode, ch.educationLevel, ch.dominantActivityKind, ch.status, ch.startedAt || null]
      );
      for (const n of ch.nodes) {
        await tx.query(
          `INSERT INTO journey_nodes (id, chapter_id, sequence, kind, title, description, prerequisite_node_ids, activity_ids, reward_preview_json, level_milestone_badge)
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10) ON CONFLICT (id) DO NOTHING`,
          [n.id, ch.id, n.sequence, n.kind, n.title, n.description, JSON.stringify(n.prerequisiteNodeIds || []), JSON.stringify(n.activityIds || []), JSON.stringify(n.rewardPreview || {}), Number(n.levelMilestoneBadge || 0)]
        );
        for (let i = 0; i < (n.activityIds || []).length; i += 1) {
          await tx.query(
            `INSERT INTO node_activity_mappings (node_id, activity_id, sequence)
             VALUES ($1,$2,$3) ON CONFLICT (node_id, activity_id) DO NOTHING`,
            [n.id, n.activityIds[i], i + 1]
          );
        }
      }
    }

    // 7. User Journey Preferences, Unlocks, Chapter Snapshots & Node Progress
    for (const [uid, seed] of Object.entries(learningJourneys.userProgressSeeds)) {
      await tx.query(
        `INSERT INTO user_journey_preferences (user_id, selection_mode, preferred_template_id, pending_template_id)
         VALUES ($1,$2,$3,$4) ON CONFLICT (user_id) DO NOTHING`,
        [uid, seed.preferences.selectionMode, seed.preferences.preferredTemplateId || 'adventure', seed.preferences.pendingTemplateId || null]
      );
      for (const ulk of seed.unlocks || []) {
        await tx.query(
          `INSERT INTO journey_template_unlocks (id, user_id, template_id, source, starts_at, expires_at)
           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id, template_id) DO NOTHING`,
          [`ulk_${uid}_${ulk.templateId}`, uid, ulk.templateId, ulk.source, ulk.startsAt, ulk.expiresAt || null]
        );
      }
      for (const [chId, snap] of Object.entries(seed.chapterSnapshots || {})) {
        await tx.query(
          `INSERT INTO journey_chapter_snapshots (id, user_id, chapter_id, template_id, template_version, selection_mode, selection_reason_json, layout_snapshot_json)
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb) ON CONFLICT (user_id, chapter_id) DO NOTHING`,
          [`snap_${uid}_${chId}`, uid, chId, snap.templateId, snap.templateVersion, snap.selectionMode, JSON.stringify(snap.selectionReason || {}), JSON.stringify(snap.layoutConfig || {})]
        );
      }
      for (const nid of seed.completedNodeIds || []) {
        await tx.query(
          `INSERT INTO user_node_progress (user_id, node_id, status, completed_at, best_score, attempt_count)
           VALUES ($1,$2,'completed',NOW(),100,1) ON CONFLICT (user_id, node_id) DO NOTHING`,
          [uid, nid]
        );
      }
      for (const nid of seed.inProgressNodeIds || []) {
        await tx.query(
          `INSERT INTO user_node_progress (user_id, node_id, status, started_at, attempt_count)
           VALUES ($1,$2,'in_progress',NOW(),1) ON CONFLICT (user_id, node_id) DO NOTHING`,
          [uid, nid]
        );
      }
    }

    // 8. Mastery, Spaced Repetition, XP Ledger, Gamification Meta, History & Notifications
    for (const xp of masteryGam.xpLedger) {
      await tx.query(
        `INSERT INTO xp_ledger (id, user_id, amount, direction, source_type, source_id, reason, idempotency_key, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (user_id, idempotency_key) DO NOTHING`,
        [xp.id, xp.userId, xp.amount, xp.direction, xp.sourceType, xp.sourceId, xp.reason, xp.idempotencyKey, xp.createdAt]
      );
    }
    for (const [uid, meta] of Object.entries(masteryGam.userGamificationMeta)) {
      const lbEntry = masteryGam.leaderboardPool.find((l) => l.userId === uid);
      await tx.query(
        `INSERT INTO user_gamification_meta (user_id, streak_days, best_streak, hearts, max_hearts, gems, daily_xp_target, daily_xp_earned, weekly_xp, league)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (user_id) DO NOTHING`,
        [uid, meta.streakDays, meta.bestStreak, meta.hearts, meta.maxHearts, meta.gems, meta.dailyXpTarget, meta.dailyXpEarned, lbEntry?.weeklyXp ?? 120, lbEntry?.league || 'Liga Safir']
      );
    }
    for (const ev of masteryGam.competencyEvidence) {
      await tx.query(
        `INSERT INTO competency_mastery_evidence (id, user_id, competency_id, question_id, question_version, correct, difficulty, hint_used, occurred_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [ev.id, ev.userId, ev.competencyId, ev.questionId, ev.questionVersion, Boolean(ev.correct), ev.difficulty, Boolean(ev.hintUsed), ev.occurredAt]
      );
    }
    for (const sr of masteryGam.spacedRepetitionItems) {
      await tx.query(
        `INSERT INTO spaced_repetition_schedules (id, user_id, competency_id, stage_index, interval_days, next_review_at, recommended_activity_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [sr.id, sr.userId, sr.competencyId, sr.stageIndex, sr.intervalDays, sr.nextReviewAt, sr.recommendedActivityId || null]
      );
    }
    for (const h of masteryGam.activityHistory) {
      await tx.query(
        `INSERT INTO activity_history (id, user_id, activity_id, title, mode, score, xp_earned, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [h.id, h.userId, h.activityId, h.title, h.mode, h.score, h.xpEarned, h.completedAt]
      );
    }
    for (const n of masteryGam.notifications) {
      await tx.query(
        `INSERT INTO notifications (id, user_id, title, body, category, read, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [n.id, n.userId, n.title, n.body, n.category, Boolean(n.read), n.createdAt]
      );
    }

    // 9. Assessments, AI Runs, Plans, Audit Logs
    for (const asm of activitiesAsm.assessments) {
      await tx.query(
        `INSERT INTO assessments (id, tenant_id, title, subtitle, mode, subject_id, duration_minutes, hearts_enabled, xp_affects_grade, scheduled_label, release_policy, release_at, question_ids)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb) ON CONFLICT (id) DO NOTHING`,
        [asm.id, asm.tenantId || null, asm.title, asm.subtitle, asm.mode, asm.subjectId, asm.durationMinutes, Boolean(asm.heartsEnabled), Boolean(asm.xpAffectsGrade), asm.scheduledLabel, asm.releasePolicy, asm.releaseAt || null, JSON.stringify(asm.questionIds || [])]
      );
    }
    for (const run of aiRuns.runs) {
      await tx.query(
        `INSERT INTO ai_generation_runs (id, tenant_id, requested_by, status, progress_pct, estimated_cost_usd, actual_cost_usd, budget_cap_usd, max_retries, brief_json, audit_trail_json, created_at, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13) ON CONFLICT (id) DO NOTHING`,
        [run.id, run.tenantId, run.requestedBy, run.status, run.progressPct, run.estimatedCostUsd, run.actualCostUsd, run.budgetCapUsd, run.maxRetries, JSON.stringify(run.brief), JSON.stringify(run.auditTrail || []), run.createdAt, run.completedAt || null]
      );
      for (const it of run.items) {
        await tx.query(
          `INSERT INTO ai_generation_items (id, run_id, status, attempt_count, generation_json, validation_report_json, question_json)
           VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb) ON CONFLICT (id) DO NOTHING`,
          [it.id, run.id, it.status, it.attemptCount, JSON.stringify(it.generation), JSON.stringify(it.validationReport), it.question ? JSON.stringify(it.question) : null]
        );
      }
    }
    for (const p of schoolAdmin.platform.plans) {
      await tx.query(
        `INSERT INTO subscription_plans (id, name, audience, price_idr, features_json)
         VALUES ($1,$2,$3,$4,$5::jsonb) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.audience, p.priceIdr, JSON.stringify(p.features || [])]
      );
    }
    for (const aud of schoolAdmin.platform.auditLogs) {
      await tx.query(
        `INSERT INTO audit_logs (id, occurred_at, actor_id, actor_name, tenant_id, action, target_id, reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [aud.id, aud.occurredAt, aud.actorId, aud.actorName, aud.tenantId || null, aud.action, aud.targetId, aud.reason]
      );
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const db = await createDbPool();
  try {
    await runMigrations(db);
    await seedDatabase(db);
    console.log('Database migrated & seeded successfully.');
  } finally {
    await db.close();
  }
}
