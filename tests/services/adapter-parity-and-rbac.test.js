import { describe, expect, it, vi } from 'vitest';
import { FIXTURES_V1, SERVICE_NAMES, createServiceProvider } from '@edumotion/services';

describe('Paritas Adapter Mock vs HTTP, Portability, RBAC & Isolasi Tenant', () => {
  it('mock dan http adapter memiliki interface dan daftar method yang identik', () => {
    const mockProvider = createServiceProvider({ config: { adapterMode: 'mock' } });
    const httpProvider = createServiceProvider({
      config: { adapterMode: 'http', apiBaseUrl: 'https://alt-backend.edumotion.test/api/v1' },
      fetchImpl: vi.fn()
    });

    for (const serviceName of SERVICE_NAMES) {
      const mockMethods = Object.keys(mockProvider[serviceName]).sort();
      const httpMethods = Object.keys(httpProvider[serviceName]).sort();
      expect(httpMethods, `Method mismatch pada ${serviceName}`).toEqual(mockMethods);
    }
  });

  it('mengganti apiBaseUrl ke backend lain bekerja lewat konfigurasi tanpa ubah komponen', async () => {
    const mockFetch = vi.fn(async (url, init) => {
      expect(url).toBe('https://fastapi-alt.example.org/api/v1/journey-templates');
      expect(init.headers['X-Correlation-ID']).toBeTruthy();
      expect(init.headers.Authorization).toBe('Bearer tok_mobile_123');
      return {
        ok: true,
        status: 200,
        json: async () => ([{ id: 'adventure', name: 'Adventure Journey' }])
      };
    });

    const provider = createServiceProvider({
      config: { adapterMode: 'http', apiBaseUrl: 'https://fastapi-alt.example.org/api/v1' },
      fetchImpl: mockFetch
    });
    await provider.tokenManager.setTokens({ accessToken: 'tok_mobile_123' });

    const templates = await provider.journey.listTemplates();
    expect(templates[0].id).toBe('adventure');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('isolasi lintas-tenant: guru Tenant B ditolak mengakses draft soal Tenant A', async () => {
    const provider = createServiceProvider({ config: { initialUserId: 'usr_teacher_b' } });
    const tenantADraft = FIXTURES_V1.questionsBank.questions.find(
      (q) => q.governance?.tenantId === 'tenant_cendekia' && q.governance?.status !== 'published'
    );
    await expect(provider.question.getById(tenantADraft.id)).rejects.toMatchObject({
      code: 'FORBIDDEN_TENANT_ACCESS',
      status: 403
    });
  });

  it('admin platform scoped (curriculum admin) ditolak pada operasi institusi & audit log', async () => {
    const provider = createServiceProvider({ config: { initialUserId: 'usr_platform_curriculum' } });
    await expect(
      provider.platformAdmin.updateInstitutionStatus('tenant_harapan', { status: 'active', auditReason: 'Test' })
    ).rejects.toMatchObject({ status: 403 });
    await expect(provider.platformAdmin.listAuditLogs()).rejects.toMatchObject({ status: 403 });
  });

  it('parent hanya dapat mengakses anak yang tertaut resmi dan leaderboard anak disamarkan', async () => {
    const provider = createServiceProvider({ config: { initialUserId: 'usr_parent_dewi' } });
    const ownChildren = await provider.school.getParentLinkedChildren();
    expect(ownChildren).toHaveLength(1);
    expect(ownChildren[0].studentId).toBe('usr_student_sd_family');

    await expect(provider.school.getParentLinkedChildren('usr_student_smp_free')).rejects.toMatchObject({
      code: 'FORBIDDEN_STUDENT_LINK',
      status: 403
    });

    await provider.auth.loginAsPersona('usr_student_smp_free');
    const board = await provider.gamification.getLeaderboard();
    const otherMinor = board.find((b) => b.userId !== 'usr_student_smp_free' && b.privacyMasked);
    expect(otherMinor).toBeTruthy();
    expect(otherMinor.displayName).toMatch(/^Penjelajah #/);
  });
});
