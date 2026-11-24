import { useCallback, useEffect, useState } from 'react';
import { Activity, Building2, CheckCircle2, Compass, ShieldCheck, Users } from 'lucide-react';
import { DEFAULT_ROLE_PERMISSION_MAP } from '@edumotion/domain';
import { useServices } from '../../app/ServiceContext.jsx';
import {
  Badge,
  Button,
  Card,
  DataTable,
  ErrorState,
  FormField,
  LoadingState,
  Modal,
  SectionHeader,
  StatCard,
  Textarea
} from '../../shared/index.js';

export function PlatformOverviewPage() {
  const { services } = useServices();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await services.platformAdmin.getOverview());
    } catch (err) {
      setError(err?.message || 'Gagal memuat ringkasan platform.');
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState message="Memuat Konsol Platform..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const maxActive = Math.max(...(data?.dailyActiveTrend || []).map((d) => d.activeUsers), 1);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Platform Console"
        title="Ringkasan Operasional EduMotion"
        subtitle="Hak akses menu dan operasi dibatasi per izin peran (Admin Kurikulum terpisah dari Super Admin)."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Total Pengguna" value={(data?.totalUsers || 0).toLocaleString('id-ID')} icon={<Users className="h-5 w-5" />} iconTone="bg-blue-50 text-blue-700" />
        <StatCard label="Institusi Aktif" value={data?.activeInstitutions || 0} icon={<Building2 className="h-5 w-5" />} iconTone="bg-purple-50 text-purple-700" />
        <StatCard label="MAU" value={(data?.monthlyActiveUsers || 0).toLocaleString('id-ID')} icon={<Activity className="h-5 w-5" />} iconTone="bg-brand-50 text-brand-700" />
        <StatCard label="Pendapatan Bulanan" value="Rp 284 jt" iconTone="bg-yellow-50 text-yellow-700" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2 space-y-4">
          <h2 className="font-display text-lg font-black">Pengguna Aktif Harian (7 Hari Terakhir)</h2>
          <div className="flex h-48 items-end gap-3 pt-4">
            {(data?.dailyActiveTrend || []).map((pt, idx) => {
              const hPct = Math.round((pt.activeUsers / maxActive) * 100);
              return (
                <div key={pt.day} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
                  <div
                    className={`w-full rounded-t-xl ${idx === data.dailyActiveTrend.length - 1 ? 'bg-brand-500' : 'bg-blue-100'}`}
                    style={{ height: `${hPct}%` }}
                    title={`${pt.day}: ${pt.activeUsers}`}
                  />
                  <span className="text-xs font-bold text-text-muted">{pt.day}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-lg font-black">Kesehatan Layanan Inti</h2>
          <div className="space-y-3">
            {(data?.systemHealth || []).map((svc) => (
              <div key={svc.service} className="flex items-center justify-between gap-2 rounded-xl border border-app-border p-3 text-xs">
                <div>
                  <p className="font-extrabold text-navy-900">{svc.service}</p>
                  <p className="text-text-muted">{svc.metric}</p>
                </div>
                <Badge tone={svc.status === 'Normal' ? 'completed' : 'warning'}>{svc.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function InstitutionsTenantsPage() {
  const { services, showToast } = useServices();
  const [institutions, setInstitutions] = useState([]);
  const [modalTenant, setModalTenant] = useState(null);
  const [auditReason, setAuditReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ov = await services.platformAdmin.getOverview();
      setInstitutions(ov.institutions || []);
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    load();
  }, [load]);

  const handleConfirmStatus = async (nextStatus) => {
    setErrorMsg('');
    try {
      await services.platformAdmin.updateInstitutionStatus(modalTenant.id, {
        status: nextStatus,
        auditReason
      });
      showToast(`Status institusi diperbarui (${nextStatus}) dan dicatat di audit log.`);
      setModalTenant(null);
      setAuditReason('');
      await load();
    } catch (err) {
      setErrorMsg(err?.fieldErrors?.auditReason || err?.message);
    }
  };

  if (loading) return <LoadingState message="Memuat daftar institusi & tenant..." />;

  const columns = [
    {
      key: 'name',
      label: 'Institusi',
      render: (t) => (
        <div>
          <p className="font-extrabold">{t.name}</p>
          <p className="text-xs text-text-muted">{t.city}</p>
        </div>
      )
    },
    { key: 'type', label: 'Tipe' },
    { key: 'plan', label: 'Paket' },
    {
      key: 'status',
      label: 'Status',
      render: (t) => <Badge tone={t.status === 'active' ? 'completed' : 'warning'}>{t.status}</Badge>
    },
    {
      key: 'actions',
      label: 'Tindakan Lintas Tenant',
      align: 'right',
      render: (t) => (
        <Button size="sm" variant="secondary" onClick={() => setModalTenant(t)}>
          Verifikasi / Ubah Status
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Manajemen Tenant"
        title="Institusi & Sekolah"
        subtitle="Setiap tindakan lintas-tenant wajib menyertakan alasan audit yang dicatat secara immutable."
      />
      <DataTable columns={columns} rows={institutions} />

      <Modal
        open={Boolean(modalTenant)}
        onClose={() => setModalTenant(null)}
        title={`Tindakan Lintas Tenant: ${modalTenant?.name || ''}`}
        subtitle="Wajib isi alasan audit minimal 5 karakter sebelum melanjutkan."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalTenant(null)}>Batal</Button>
            <Button variant="danger" onClick={() => handleConfirmStatus('suspended')}>Tangguhkan</Button>
            <Button onClick={() => handleConfirmStatus('active')}>Aktifkan / Verifikasi</Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField id="aud-reason" label="Alasan Audit (Wajib)" required error={errorMsg}>
            <Textarea
              id="aud-reason"
              rows={3}
              value={auditReason}
              error={errorMsg}
              onChange={(e) => setAuditReason(e.target.value)}
              placeholder="Contoh: Verifikasi NPSN dan dokumen legal sekolah disetujui."
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}

export function JourneyTemplateAdminPage() {
  const { services, showToast } = useServices();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await services.platformAdmin.listJourneyTemplatesAdmin());
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleEnabled = async (tpl) => {
    await services.platformAdmin.updateJourneyTemplateConfig(tpl.id, { enabled: !tpl.enabled });
    showToast(`Template ${tpl.name} ${!tpl.enabled ? 'diaktifkan' : 'dinonaktifkan untuk chapter mendatang'}. Snapshot aktif siswa tetap aman.`);
    await load();
  };

  if (loading) return <LoadingState message="Memuat konfigurasi katalog Journey Template..." />;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Journey Configuration"
        title="Katalog & Kebijakan Journey Template"
        subtitle="Menonaktifkan template hanya berlaku untuk chapter baru. Snapshot chapter yang sedang berjalan tetap dapat dirender."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((tpl) => (
          <Card key={tpl.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display text-base font-black">
                <Compass className="h-5 w-5 text-brand-700" aria-hidden="true" />
                <span>{tpl.name}</span>
              </div>
              <Badge tone={tpl.enabled ? 'completed' : 'locked'}>{tpl.enabled ? 'Aktif' : 'Nonaktif'}</Badge>
            </div>
            <p className="text-xs text-text-secondary">{tpl.description}</p>
            <div className="text-xs font-bold text-text-muted space-y-1">
              <p>Akses: {tpl.base ? 'Base (Semua Siswa)' : 'Special (Achievement / Premium)'}</p>
              <p>Priority Weight Adaptive: {tpl.priorityWeight}</p>
            </div>
            <Button
              size="sm"
              variant={tpl.enabled ? 'secondary' : 'primary'}
              onClick={() => toggleEnabled(tpl)}
              className="w-full"
            >
              {tpl.enabled ? 'Nonaktifkan untuk Chapter Baru' : 'Aktifkan Kembali'}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function GlobalRbacMatrixPage() {
  const entries = Object.entries(DEFAULT_ROLE_PERMISSION_MAP);
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Keamanan & Akses" title="Matriks RBAC & Permission Scope" subtitle="Semua admin tidak disamakan sebagai superuser. Akses diperiksa pada level izin + tenant/resource scope." />
      <div className="grid gap-3 md:grid-cols-2">
        {entries.map(([role, perms]) => (
          <Card key={role} className="space-y-2">
            <div className="flex items-center gap-2 font-display text-base font-black">
              <ShieldCheck className="h-4 w-4 text-brand-700" aria-hidden="true" />
              <span>{role}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {perms.map((p) => (
                <Badge key={p} tone="info" showIcon={false}>{p}</Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AuditLogsPage() {
  const { services } = useServices();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    services.platformAdmin.listAuditLogs().then(setLogs).finally(() => setLoading(false));
  }, [services]);

  if (loading) return <LoadingState message="Memuat jejak audit immutable..." />;

  const columns = [
    { key: 'occurredAt', label: 'Waktu', render: (r) => new Date(r.occurredAt).toLocaleString('id-ID') },
    { key: 'actorName', label: 'Aktor' },
    { key: 'action', label: 'Aksi', render: (r) => <Badge tone="info">{r.action}</Badge> },
    { key: 'reason', label: 'Alasan / Detail' }
  ];

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Keamanan & Kepatuhan" title="Audit Log Sistem" subtitle="Rekaman seluruh aksi istimewa, publikasi soal, konseling, dan tindakan lintas tenant." />
      <DataTable columns={columns} rows={logs} />
    </div>
  );
}

export function PlatformSubSectionPage({ title, subtitle, mode = 'generic' }) {
  const { services } = useServices();
  const [taxonomy, setTaxonomy] = useState(null);
  const [plans, setPlans] = useState([]);
  const [personas, setPersonas] = useState([]);

  useEffect(() => {
    Promise.all([
      services.learning.getTaxonomy(),
      services.platformAdmin.listPlans(),
      services.auth.listPersonas()
    ]).then(([t, pl, pe]) => {
      setTaxonomy(t);
      setPlans(pl);
      setPersonas(pe);
    });
  }, [services]);

  if (mode === 'curricula') {
    return (
      <div className="space-y-6">
        <SectionHeader eyebrow="Kurikulum Global" title={title} subtitle={subtitle} />
        <div className="grid gap-4 md:grid-cols-3">
          {(taxonomy?.curricula || []).map((c) => (
            <Card key={c.id} className="space-y-2">
              <Badge tone="completed">{c.code}</Badge>
              <h3 className="font-display text-lg font-black">{c.name}</h3>
              <p className="text-xs text-text-muted">Versi aktif: {c.versions?.[0]?.version}</p>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (mode === 'billing') {
    return (
      <div className="space-y-6">
        <SectionHeader eyebrow="Monetisasi & Entitlement" title={title} subtitle={subtitle} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((p) => (
            <Card key={p.id} className="space-y-2">
              <Badge tone="info">{p.audience}</Badge>
              <h3 className="font-display text-lg font-black">{p.name}</h3>
              <p className="font-display text-xl font-black text-brand-700">Rp {p.priceIdr.toLocaleString('id-ID')}</p>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Konsol Platform" title={title} subtitle={subtitle} />
      <DataTable
        columns={[
          { key: 'displayName', label: 'Nama', render: (r) => <span className="font-extrabold">{r.displayName}</span> },
          { key: 'role', label: 'Peran', render: (r) => <Badge tone="info">{r.role}</Badge> },
          { key: 'entitlement', label: 'Entitlement' },
          { key: 'status', label: 'Status', render: () => <Badge tone="completed"><CheckCircle2 className="h-3 w-3" /> Aktif</Badge> }
        ]}
        rows={personas}
      />
    </div>
  );
}
