import { useCallback, useEffect, useState } from 'react';
import { Award, Flame, ShieldCheck, Trophy, Zap } from 'lucide-react';
import { useServices } from '../../app/ServiceContext.jsx';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  ProgressBar,
  SectionHeader
} from '../../shared/index.js';

export function LeaderboardPage() {
  const { services, showToast } = useServices();
  const [board, setBoard] = useState([]);
  const [stats, setStats] = useState(null);
  const [qaData, setQaData] = useState({ quests: [], achievements: [] });
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [lb, st, qa] = await Promise.all([
        services.gamification.getLeaderboard(),
        services.gamification.getDashboardStats(),
        services.gamification.getQuestsAndAchievements()
      ]);
      setBoard(lb);
      setStats(st);
      setQaData(qa);
    } catch (err) {
      setError(err?.message || 'Gagal memuat papan peringkat dan misi.');
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    load();
  }, [load]);

  const handleClaimQuest = async (questId) => {
    try {
      const res = await services.gamification.claimQuestReward(questId, {
        idempotencyKey: `claim_${questId}`
      });
      showToast(
        res.alreadyClaimed
          ? 'Hadiah misi sudah diklaim sebelumnya.'
          : `Hadiah misi diklaim! Saldo XP: ${res.xpBalance}`
      );
      await load();
    } catch (err) {
      showToast(err?.message || 'Gagal mengklaim hadiah.', 'error');
    }
  };

  if (loading) return <LoadingState message="Memuat liga, misi, dan buku besar XP..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Gamifikasi & Komunitas Aman"
        title="Liga Belajar, Misi & Lencana"
        subtitle="XP dan Rank Level 0–10 terpisah dari nilai akademik. Nama siswa di bawah umur disamarkan otomatis demi privasi anak."
        action={
          <Button variant="secondary" size="sm" onClick={() => setLedgerOpen(true)}>
            <Zap className="h-4 w-4 text-yellow-700" aria-hidden="true" />
            Lihat XP Ledger ({stats?.xpBalance || 0} XP)
          </Button>
        }
      />

      {stats ? (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase text-text-muted">Peringkat Pemain (Presentasi)</p>
            <h2 className="mt-1 font-display text-xl font-black text-navy-900">
              Level {stats.rank.level} · {stats.rank.title}
            </h2>
            <p className="text-xs font-semibold text-text-secondary">
              {stats.rank.nextRank
                ? `${stats.rank.xpToNext} XP lagi menuju Level ${stats.rank.nextRank.level} (${stats.rank.nextRank.title})`
                : 'Peringkat milestone tertinggi tercapai!'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone="warning">
              <Flame className="h-3.5 w-3.5" aria-hidden="true" />
              {stats.streakDays} Hari Streak
            </Badge>
            <Badge tone="info">💎 {stats.gems} Gems</Badge>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-black">Papan Peringkat Mingguan</h2>
            <Badge tone="completed">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Privasi Anak Aktif
            </Badge>
          </div>

          {board.length === 0 ? (
            <EmptyState title="Leaderboard kosong" description="Belum ada peserta pada minggu ini." />
          ) : (
            <div className="space-y-2.5">
              {board.map((row) => (
                <div
                  key={row.userId}
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 ${
                    row.isSelf ? 'border-brand-500 bg-brand-50/50' : 'border-app-border bg-white'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-subtle font-display text-sm font-black">
                      #{row.rank}
                    </span>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-black text-blue-700">
                      {row.avatarInitials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-navy-900">
                        {row.displayName} {row.isSelf ? '(Kamu)' : ''}
                      </p>
                      <p className="text-[11px] font-semibold text-text-muted">
                        {row.league} · {row.privacyMasked ? 'Nama disamarkan (anak)' : 'Profil publik'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="font-display text-base font-black text-navy-900">{row.weeklyXp} XP</p>
                    <p className="text-[11px] font-bold text-orange-700">🔥 {row.streakDays} hr</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="space-y-3">
            <h2 className="font-display text-lg font-black">Misi Harian & Mingguan</h2>
            <div className="space-y-3">
              {qaData.quests.map((q) => (
                <div key={q.id} className="rounded-xl border border-app-border p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="info">{q.cadence}</Badge>
                    <span className="text-xs font-extrabold text-orange-700">+{q.rewardXp} XP · +{q.rewardGems} Gems</span>
                  </div>
                  <p className="text-sm font-extrabold text-navy-900">{q.title}</p>
                  <ProgressBar value={q.progressCount} max={q.targetCount} label={q.title} />
                  <Button
                    size="sm"
                    variant={q.claimed ? 'secondary' : 'primary'}
                    disabled={q.claimed || q.progressCount < q.targetCount}
                    onClick={() => handleClaimQuest(q.id)}
                    className="w-full"
                  >
                    {q.claimed ? 'Sudah Diklaim' : q.progressCount >= q.targetCount ? 'Klaim Hadiah' : 'Belum Selesai'}
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-3">
            <h2 className="font-display text-lg font-black">Koleksi Achievement</h2>
            <div className="space-y-2.5">
              {qaData.achievements.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-xl border border-app-border p-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${a.earned ? 'bg-yellow-50 text-yellow-700' : 'bg-surface-subtle text-text-muted'}`}>
                    {a.earned ? <Trophy className="h-5 w-5" /> : <Award className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-extrabold text-navy-900">{a.title}</p>
                      <Badge tone={a.earned ? 'completed' : 'locked'}>{a.earned ? 'Diraih' : 'Belum'}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-text-secondary">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={ledgerOpen}
        onClose={() => setLedgerOpen(false)}
        title="Append-Only XP Ledger"
        subtitle="Catatan transaksi XP bersifat permanen (koreksi memakai entri kompensasi) dan idempotent."
        maxWidth="max-w-xl"
        footer={<Button variant="secondary" onClick={() => setLedgerOpen(false)}>Tutup</Button>}
      >
        <div className="space-y-2">
          {(stats?.ledgerEntries || []).map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl border border-app-border p-3 text-xs">
              <div>
                <p className="font-extrabold text-navy-900">{entry.reason}</p>
                <p className="text-text-muted">Key: {entry.idempotencyKey} · {entry.sourceType}</p>
              </div>
              <span className={`font-display text-sm font-black tabular-nums ${entry.direction === 'debit_compensation' ? 'text-red-700' : 'text-brand-700'}`}>
                {entry.direction === 'debit_compensation' ? '-' : '+'}{entry.amount} XP
              </span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
