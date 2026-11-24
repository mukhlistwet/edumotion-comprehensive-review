export const PLAYER_MILESTONE_RANKS = Object.freeze([
  { level: 0, title: 'Getting Started', minXp: 0 },
  { level: 1, title: 'Foundation', minXp: 100 },
  { level: 2, title: 'Explorer', minXp: 250 },
  { level: 3, title: 'Problem Solver', minXp: 400 },
  { level: 4, title: 'Builder', minXp: 650 },
  { level: 5, title: 'Master', minXp: 950 },
  { level: 6, title: 'Application Hero', minXp: 1300 },
  { level: 7, title: 'Strategic Thinker', minXp: 1700 },
  { level: 8, title: 'Expert', minXp: 2200 },
  { level: 9, title: 'Champion', minXp: 2800 },
  { level: 10, title: 'Legend', minXp: 3500 }
]);

export function computeXpBalance(ledgerEntries = []) {
  return ledgerEntries.reduce((total, entry) => {
    const amt = Number(entry.amount || 0);
    return entry.direction === 'debit_compensation' ? total - amt : total + amt;
  }, 0);
}

/**
 * Append-only XP ledger award with strict idempotency per userId + idempotencyKey.
 */
export function appendXpLedgerEntry(ledgerEntries = [], entryInput) {
  const key = `${entryInput.userId}:${entryInput.idempotencyKey}`;
  const existing = ledgerEntries.find(
    (e) => `${e.userId}:${e.idempotencyKey}` === key
  );
  if (existing) {
    return {
      entries: ledgerEntries,
      entry: existing,
      duplicate: true,
      balance: computeXpBalance(ledgerEntries.filter((e) => e.userId === entryInput.userId))
    };
  }
  const newEntry = {
    id: entryInput.id || `xp_${ledgerEntries.length + 1}_${entryInput.idempotencyKey}`,
    userId: entryInput.userId,
    amount: Math.abs(Number(entryInput.amount || 0)),
    direction: entryInput.direction || 'credit',
    sourceType: entryInput.sourceType || 'activity_completion',
    sourceId: entryInput.sourceId || null,
    reason: entryInput.reason || 'Menyelesaikan aktivitas belajar',
    idempotencyKey: entryInput.idempotencyKey,
    createdAt: entryInput.createdAt || new Date().toISOString()
  };
  const nextEntries = [...ledgerEntries, newEntry];
  return {
    entries: nextEntries,
    entry: newEntry,
    duplicate: false,
    balance: computeXpBalance(nextEntries.filter((e) => e.userId === entryInput.userId))
  };
}

/**
 * Compensating debit entry for XP reversals — never deletes or mutates past entries.
 */
export function reverseXpLedgerEntry(ledgerEntries = [], targetEntryId, reason = 'Koreksi sistem') {
  const target = ledgerEntries.find((e) => e.id === targetEntryId);
  if (!target) {
    const err = new Error('Entri XP target tidak ditemukan.');
    err.code = 'XP_ENTRY_NOT_FOUND';
    throw err;
  }
  return appendXpLedgerEntry(ledgerEntries, {
    userId: target.userId,
    amount: target.amount,
    direction: 'debit_compensation',
    sourceType: 'reversal',
    sourceId: target.id,
    reason,
    idempotencyKey: `reversal:${target.id}`
  });
}

export function getPlayerRankFromXp(xpBalance = 0) {
  let rank = PLAYER_MILESTONE_RANKS[0];
  for (const r of PLAYER_MILESTONE_RANKS) {
    if (xpBalance >= r.minXp) rank = r;
  }
  const next = PLAYER_MILESTONE_RANKS.find((r) => r.level === rank.level + 1) || null;
  return {
    ...rank,
    xpBalance,
    nextRank: next,
    xpToNext: next ? Math.max(0, next.minXp - xpBalance) : 0
  };
}

export function shouldUseHearts(assessmentMode) {
  return assessmentMode === 'practice';
}

export function projectLeaderboardEntry(entry, viewerUserId) {
  const isSelf = entry.userId === viewerUserId;
  const shouldMask = Boolean(entry.isMinor) && !isSelf && entry.privacyOptInPublicName !== true;
  const codeSuffix = String(entry.userId || '0000').slice(-4).toUpperCase();
  return {
    rank: entry.rank,
    userId: isSelf ? entry.userId : `anon_${codeSuffix}`,
    displayName: shouldMask ? `Penjelajah #${codeSuffix}` : entry.displayName,
    avatarInitials: shouldMask ? 'P' : entry.avatarInitials,
    weeklyXp: Number(entry.weeklyXp || 0),
    streakDays: Number(entry.streakDays || 0),
    league: entry.league || 'Liga Perunggu',
    isSelf,
    privacyMasked: shouldMask
  };
}
