// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createDbPool } from '../../apps/api/src/db/pool.js';
import { runMigrations } from '../../apps/api/src/db/migrate.js';
import { seedDatabase } from '../../apps/api/src/db/seed.js';
import { exportDatabaseBackup, restoreDatabaseBackup } from '../../apps/api/src/db/backup-restore.js';

describe('PostgreSQL Migrations, Append-Only DB Guards, Seed Deterministik & Backup/Restore', () => {
  it('migrasi berversi idempotent dan penegakan trigger append-only pada xp_ledger serta audit_logs bekerja di level DB', async () => {
    const db = await createDbPool({ pgliteDataDir: 'memory://' });
    try {
      const first = await runMigrations(db);
      expect(first.applied).toEqual(['001_canonical_schema.sql', '002_indexes_and_guards.sql']);

      // Repeatable migration re-run
      const second = await runMigrations(db);
      expect(second.applied).toEqual([]);

      await seedDatabase(db);
      await seedDatabase(db); // idempotent seed re-run

      const userCount = await db.query('SELECT COUNT(*)::int AS cnt FROM users');
      expect(userCount.rows[0].cnt).toBe(13);

      // Database-level append-only guard rejects direct UPDATE or DELETE on xp_ledger and audit_logs
      await expect(
        db.query(`UPDATE xp_ledger SET amount = 999999 WHERE id = 'xp_seed_1'`)
      ).rejects.toThrow(/APPEND_ONLY_VIOLATION/i);

      await expect(
        db.query(`DELETE FROM audit_logs WHERE id = 'aud_1'`)
      ).rejects.toThrow(/APPEND_ONLY_VIOLATION/i);
    } finally {
      await db.close();
    }
  });

  it('backup snapshot dan restore ke database PostgreSQL bersih memulihkan seluruh tabel dengan checksum cocok', async () => {
    const sourceDb = await createDbPool({ pgliteDataDir: 'memory://' });
    const targetDb = await createDbPool({ pgliteDataDir: 'memory://' });
    try {
      await runMigrations(sourceDb);
      await seedDatabase(sourceDb);
      const backup = await exportDatabaseBackup(sourceDb);

      await runMigrations(targetDb);
      const restored = await restoreDatabaseBackup(targetDb, backup);
      expect(restored.verified).toBe(true);
      expect(restored.rowCounts.users).toBe(backup.rowCounts.users);
      expect(restored.rowCounts.question_versions).toBe(backup.rowCounts.question_versions);
      expect(restored.rowCounts.xp_ledger).toBe(backup.rowCounts.xp_ledger);
      expect(restored.rowCounts.journey_chapter_snapshots).toBe(backup.rowCounts.journey_chapter_snapshots);
    } finally {
      await sourceDb.close();
      await targetDb.close();
    }
  });
});
