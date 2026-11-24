export function mapUserRow(row, linkedStudentIds = []) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    initials: row.initials,
    role: row.role,
    tenantId: row.tenant_id || null,
    educationLevel: row.education_level || null,
    curriculumId: row.curriculum_id || 'cur_merdeka',
    gradeLevelId: row.grade_level_id || null,
    classId: row.class_id || null,
    entitlement: row.entitlement,
    isMinor: Boolean(row.is_minor),
    privacyOptInPublicName: Boolean(row.privacy_opt_in_public_name),
    assignedClassIds: row.assigned_class_ids || [],
    assignedSubjectIds: row.assigned_subject_ids || [],
    permissions: row.permissions || [],
    customRoleIds: row.custom_role_ids || [],
    linkedStudentIds,
    title: row.title || row.display_name,
    description: row.description || ''
  };
}

export function createSqlRepositories(db) {
  async function getLinkedStudentIds(userId, tx = db) {
    const res = await tx.query(
      `SELECT student_user_id FROM parent_student_links WHERE parent_user_id = $1 ORDER BY student_user_id`,
      [userId]
    );
    return res.rows.map((r) => r.student_user_id);
  }

  return {
    db,

    async getUserById(userId, tx = db) {
      const res = await tx.query(`SELECT * FROM users WHERE id = $1`, [userId]);
      if (res.rows.length === 0) return null;
      const linked = await getLinkedStudentIds(userId, tx);
      return mapUserRow(res.rows[0], linked);
    },

    async getUserAuthByEmail(email) {
      const res = await db.query(`SELECT * FROM users WHERE LOWER(email) = LOWER($1)`, [String(email || '').trim()]);
      if (res.rows.length === 0) return null;
      const linked = await getLinkedStudentIds(res.rows[0].id);
      return {
        user: mapUserRow(res.rows[0], linked),
        passwordHash: res.rows[0].password_hash
      };
    },

    async listPublicPersonas() {
      const res = await db.query(`SELECT * FROM users ORDER BY created_at ASC, id ASC`);
      const linksRes = await db.query(`SELECT parent_user_id, student_user_id FROM parent_student_links`);
      const linkMap = new Map();
      for (const l of linksRes.rows) {
        const list = linkMap.get(l.parent_user_id) || [];
        list.push(l.student_user_id);
        linkMap.set(l.parent_user_id, list);
      }
      return res.rows.map((r) => mapUserRow(r, linkMap.get(r.id) || []));
    },

    async listCustomRoles(tenantId) {
      const res = await db.query(`SELECT * FROM school_custom_roles WHERE tenant_id = $1 ORDER BY created_at ASC`, [tenantId]);
      return res.rows.map((r) => ({
        id: r.id,
        tenantId: r.tenant_id,
        name: r.name,
        permissions: r.permissions || []
      }));
    },

    async listTemplateCatalog(tx = db) {
      const res = await tx.query(`SELECT * FROM journey_template_catalog ORDER BY priority_weight DESC, id ASC`);
      return res.rows.map((r) => ({
        ...(r.config_json || {}),
        id: r.id,
        version: r.version,
        name: r.name,
        base: Boolean(r.base),
        enabled: Boolean(r.enabled),
        priorityWeight: Number(r.priority_weight)
      }));
    },

    async getChapterWithNodes(journeyId, chapterId, tx = db) {
      const chRes = await tx.query(
        `SELECT * FROM journey_chapters WHERE id = $1 AND journey_id = $2`,
        [chapterId, journeyId]
      );
      if (chRes.rows.length === 0) return null;
      const chRow = chRes.rows[0];
      const nodesRes = await tx.query(
        `SELECT * FROM journey_nodes WHERE chapter_id = $1 ORDER BY sequence ASC`,
        [chapterId]
      );
      return {
        id: chRow.id,
        journeyId: chRow.journey_id,
        pathId: chRow.path_id,
        sequence: Number(chRow.sequence),
        title: chRow.title,
        subjectCode: chRow.subject_code,
        educationLevel: chRow.education_level,
        dominantActivityKind: chRow.dominant_activity_kind,
        status: chRow.status,
        startedAt: chRow.started_at,
        nodes: nodesRes.rows.map((n) => ({
          id: n.id,
          sequence: Number(n.sequence),
          kind: n.kind,
          title: n.title,
          description: n.description,
          prerequisiteNodeIds: n.prerequisite_node_ids || [],
          activityIds: n.activity_ids || [],
          rewardPreview: n.reward_preview_json || {},
          levelMilestoneBadge: Number(n.level_milestone_badge || 0)
        }))
      };
    },

    async listTaxonomy() {
      const [curricula, versions, grades, subjects, topics, competencies] = await Promise.all([
        db.query(`SELECT * FROM curricula ORDER BY id`),
        db.query(`SELECT * FROM curriculum_versions ORDER BY id`),
        db.query(`SELECT * FROM grade_levels ORDER BY id`),
        db.query(`SELECT * FROM subjects ORDER BY id`),
        db.query(`SELECT * FROM topics ORDER BY id`),
        db.query(`SELECT * FROM competencies ORDER BY id`)
      ]);
      return {
        curricula: curricula.rows.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          status: c.status,
          versions: versions.rows
            .filter((v) => v.curriculum_id === c.id)
            .map((v) => ({ id: v.id, version: v.version, effectiveFrom: v.effective_from, status: v.status }))
        })),
        gradeLevels: grades.rows.map((g) => ({
          id: g.id,
          educationLevel: g.education_level,
          gradeCode: g.grade_code,
          displayName: g.display_name
        })),
        subjects: subjects.rows.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          description: s.description
        })),
        topics: topics.rows.map((t) => ({
          id: t.id,
          subjectId: t.subject_id,
          parentId: t.parent_id,
          code: t.code,
          name: t.name
        })),
        competencies: competencies.rows.map((c) => ({
          id: c.id,
          topicId: c.topic_id,
          code: c.code,
          description: c.description
        }))
      };
    }
  };
}
