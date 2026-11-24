import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ROLES } from '@edumotion/domain';
import { colors } from '@edumotion/design-tokens';
import { MobileQuestionCard } from '../components/MobileQuestionCard.jsx';
import { MobileJourneyMap } from '../components/MobileJourneyMap.jsx';

export function MobileAuthScreen({ services, onAuthenticated }) {
  const [personas, setPersonas] = useState([]);
  const [email, setEmail] = useState('bima.smp@edumotion.demo');
  const [password, setPassword] = useState('edumotion-demo');
  const [error, setError] = useState('');

  useEffect(() => {
    services.auth
      .listPersonas()
      .then((list) => {
        setPersonas(list.filter((p) => p.role === ROLES.STUDENT || p.role === ROLES.PARENT));
      })
      .catch(() => setPersonas([]));
  }, [services]);

  const handleLogin = async () => {
    setError('');
    try {
      const res = await services.auth.loginWithCredentials({ email, password });
      onAuthenticated(res.user);
    } catch (err) {
      setError(err?.message || 'Gagal masuk.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <View style={styles.brandBanner}>
        <Text style={styles.brandTitle}>EduMotion Mobile</Text>
        <Text style={styles.brandSub}>React Native + Expo · SecureStore Token Flow</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Masuk Akun Siswa / Orang Tua</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Kata sandi"
          secureTextEntry
          style={styles.input}
        />
        <Pressable accessibilityRole="button" onPress={handleLogin} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Masuk</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pilih Cepat Persona Mobile</Text>
        {personas.map((p) => (
          <Pressable
            key={p.id}
            onPress={async () => {
              const res = await services.auth.loginAsPersona(p.id);
              onAuthenticated(res.user);
            }}
            style={styles.personaBtn}
          >
            <Text style={styles.personaTitle}>{p.title}</Text>
            <Text style={styles.mutedText}>{p.email}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

export function MobileHomeScreen({ services, user, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [mastery, setMastery] = useState(null);

  useEffect(() => {
    Promise.all([services.gamification.getDashboardStats(), services.mastery.getOverview()]).then(
      ([st, mst]) => {
        setStats(st);
        setMastery(mst);
      }
    );
  }, [services]);

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>RUANG BELAJAR MOBILE</Text>
        <Text style={styles.heroTitle}>Halo, {user.displayName}!</Text>
        <Text style={styles.heroSub}>
          Target harian: {stats?.dailyXpEarned ?? 0} / {stats?.dailyXpTarget ?? 30} XP · Streak {stats?.streakDays ?? 0} hari
        </Text>
        <Pressable onPress={() => onNavigate('journey')} style={styles.whiteBtn}>
          <Text style={styles.whiteBtnText}>Lanjutkan Journey →</Text>
        </Pressable>
      </View>

      <View style={styles.gridRow}>
        <View style={styles.statBox}>
          <Text style={styles.mutedText}>Total XP</Text>
          <Text style={styles.statVal}>{stats?.xpBalance ?? 0}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.mutedText}>Review Jatuh Tempo</Text>
          <Text style={styles.statVal}>{mastery?.dueReviews?.length ?? 0} topik</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Akses Cepat</Text>
        <Pressable onPress={() => onNavigate('practice')} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Buka Latihan & Ujian Formal</Text>
        </Pressable>
        <Pressable onPress={() => onNavigate('mastery')} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Cek Penguasaan Kompetensi</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export function MobileJourneyScreen({ services, onOpenActivity }) {
  const [viewModel, setViewModel] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [prefs, setPrefs] = useState({ selectionMode: 'adaptive', pendingTemplateId: null });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const [mapRes, tpls, pr] = await Promise.all([
      services.journey.getChapterMap('jrn_math_smp_algebra', 'ch_alg_01'),
      services.journey.listTemplates(),
      services.journey.getPreferences()
    ]);
    setViewModel(mapRes.viewModel);
    setTemplates(tpls);
    setPrefs(pr);
    if (mapRes.viewModel) {
      setSelectedNodeId(mapRes.viewModel.progress.currentNodeId || mapRes.viewModel.nodes[0]?.id);
    }
  }, [services]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedNode = viewModel?.nodes?.find((n) => n.id === selectedNodeId);

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      {notice ? <Text style={styles.noticeBanner}>{notice}</Text> : null}

      <MobileJourneyMap
        viewModel={viewModel}
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
      />

      {selectedNode ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Checkpoint #{selectedNode.sequence}: {selectedNode.title}</Text>
          <Text style={styles.mutedText}>{selectedNode.description}</Text>
          <Pressable
            disabled={selectedNode.status === 'locked'}
            onPress={() => onOpenActivity(selectedNode.activityIds?.[0] || 'act_alg_intro')}
            style={[styles.primaryBtn, selectedNode.status === 'locked' && { opacity: 0.5 }]}
          >
            <Text style={styles.primaryBtnText}>
              {selectedNode.status === 'locked' ? 'Terkunci (Selesaikan Prasyarat)' : 'Mulai Aktivitas'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pilih Gaya Chapter Berikutnya ({prefs.selectionMode})</Text>
        <View style={styles.chipWrap}>
          {templates.map((t) => (
            <Pressable
              key={t.id}
              onPress={async () => {
                try {
                  const res = await services.journey.setPendingTemplate({ templateId: t.id });
                  setNotice(res.message);
                  await load();
                } catch (err) {
                  setNotice(err?.message || 'Template terkunci');
                }
              }}
              style={[
                styles.tplChip,
                viewModel?.template?.id === t.id && { borderColor: colors.brand[500] },
                !t.eligible && { opacity: 0.55 }
              ]}
            >
              <Text style={styles.tplChipText}>
                {t.name} {t.eligible ? '' : '🔒'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

export function MobilePracticeExamScreen({ services, activityId = 'act_alg_intro' }) {
  const [mode, setMode] = useState('practice');
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [examSession, setExamSession] = useState(null);

  useEffect(() => {
    services.learning.getActivityDelivery(activityId).then((res) => {
      setQuestions(res.questions || []);
      setIdx(0);
      setFeedback(null);
    });
  }, [services, activityId]);

  const startFormalExam = async () => {
    const res = await services.assessment.startSession('asm_tryout_math_01', {
      idempotencyKey: 'mobile_tryout_1'
    });
    setExamSession(res.session);
    setQuestions(res.session.snapshots.map((s) => s.deliveryDto));
    setIdx(0);
    setMode('exam');
    setFeedback(null);
  };

  const activeQ = questions[idx];

  const handleSubmitPractice = async () => {
    if (!activeQ) return;
    if (mode === 'exam' && examSession) {
      const snap = examSession.snapshots[idx];
      await services.assessment.autosaveResponse(examSession.id, snap.snapshotId, {
        response: answers[activeQ.questionId],
        idempotencyKey: `mob_save_${snap.snapshotId}`
      });
      setFeedback({ correct: true, message: 'Jawaban tersimpan otomatis (Mode Ujian, tanpa hearts).' });
      return;
    }
    const res = await services.learning.submitPracticeAttempt(activityId, {
      questionId: activeQ.questionId,
      response: answers[activeQ.questionId],
      idempotencyKey: `mob_${activityId}_${activeQ.questionId}`
    });
    setFeedback({ correct: res.correct, message: res.feedback?.message });
  };

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <View style={styles.gridRow}>
        <Pressable
          onPress={() => setMode('practice')}
          style={[styles.modePill, mode === 'practice' && styles.modePillActive]}
        >
          <Text style={styles.modePillText}>Latihan</Text>
        </Pressable>
        <Pressable
          onPress={startFormalExam}
          style={[styles.modePill, mode === 'exam' && styles.modePillActive]}
        >
          <Text style={styles.modePillText}>Ujian Formal (No Hearts)</Text>
        </Pressable>
      </View>

      {activeQ ? (
        <>
          <Text style={styles.mutedText}>
            Soal {idx + 1} dari {questions.length}
          </Text>
          <MobileQuestionCard
            question={activeQ}
            value={answers[activeQ.questionId]}
            onChange={(v) => setAnswers((a) => ({ ...a, [activeQ.questionId]: v }))}
          />
          {feedback ? (
            <View style={[styles.card, { borderColor: feedback.correct ? colors.brand[500] : colors.red[500] }]}>
              <Text style={styles.cardTitle}>{feedback.message}</Text>
            </View>
          ) : null}
          <View style={styles.gridRow}>
            <Pressable style={styles.secondaryBtn} onPress={handleSubmitPractice}>
              <Text style={styles.secondaryBtnText}>{mode === 'exam' ? 'Simpan Otomatis' : 'Periksa'}</Text>
            </Pressable>
            {idx < questions.length - 1 ? (
              <Pressable style={styles.primaryBtn} onPress={() => { setIdx((i) => i + 1); setFeedback(null); }}>
                <Text style={styles.primaryBtnText}>Lanjut →</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

export function MobileMasteryScreen({ services }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    services.mastery.getOverview().then(setData);
  }, [services]);

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Penguasaan Kompetensi (0–100)</Text>
        <Text style={styles.mutedText}>Mastery dihitung terpisah dari XP dan mendukung spaced repetition 1/3/7/14/30 hari.</Text>
        {(data?.competencies || []).slice(0, 6).map((c) => (
          <View key={c.id} style={styles.listRow}>
            <Text style={styles.listMain}>{c.description}</Text>
            <Text style={styles.listBadge}>{c.score}/100</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function MobileLeaderboardScreen({ services }) {
  const [board, setBoard] = useState([]);

  useEffect(() => {
    services.gamification.getLeaderboard().then(setBoard);
  }, [services]);

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Liga Mingguan (Privasi Anak Aktif)</Text>
        {board.map((row) => (
          <View key={row.userId} style={styles.listRow}>
            <Text style={styles.listMain}>
              #{row.rank} {row.displayName} {row.isSelf ? '(Kamu)' : ''}
            </Text>
            <Text style={styles.listBadge}>{row.weeklyXp} XP</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function MobileParentScreen({ services }) {
  const [children, setChildren] = useState([]);

  useEffect(() => {
    services.school.getParentLinkedChildren().then(setChildren).catch(() => {});
  }, [services]);

  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pantau Anak (Orang Tua)</Text>
        {children.map((c) => (
          <View key={c.studentId} style={styles.listRow}>
            <Text style={styles.listMain}>{c.displayName} ({c.educationLevel})</Text>
            <Text style={styles.listBadge}>{c.xpBalance} XP</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function MobileProfileScreen({ user, onLogout }) {
  return (
    <ScrollView contentContainerStyle={styles.screenPad}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{user.displayName}</Text>
        <Text style={styles.mutedText}>Peran: {user.role} · Paket: {user.entitlement}</Text>
        <Text style={styles.mutedText}>Token disimpan melalui abstraksi Expo SecureStore (tanpa browser storage).</Text>
        <Pressable onPress={onLogout} style={styles.dangerBtn}>
          <Text style={styles.primaryBtnText}>Keluar Akun</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenPad: { padding: 16, gap: 14 },
  brandBanner: { backgroundColor: colors.brand[500], borderRadius: 20, padding: 18 },
  brandTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
  brandSub: { fontSize: 12, fontWeight: '700', color: colors.brand[50], marginTop: 4 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: 16,
    gap: 10
  },
  cardTitle: { fontSize: 16, fontWeight: '900', color: colors.navy[900] },
  mutedText: { fontSize: 12, color: colors.text.secondary },
  errorText: { fontSize: 12, fontWeight: '800', color: colors.red[700] },
  input: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surface.border,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy[900]
  },
  primaryBtn: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: colors.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  secondaryBtn: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: colors.surface.base,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14
  },
  secondaryBtnText: { color: colors.navy[900], fontSize: 13, fontWeight: '800' },
  dangerBtn: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: colors.red[500],
    alignItems: 'center',
    justifyContent: 'center'
  },
  personaBtn: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: 12
  },
  personaTitle: { fontSize: 14, fontWeight: '800', color: colors.navy[900] },
  heroCard: { backgroundColor: colors.brand[500], borderRadius: 20, padding: 18, gap: 6 },
  heroEyebrow: { fontSize: 11, fontWeight: '900', color: colors.brand[50] },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
  heroSub: { fontSize: 13, fontWeight: '700', color: colors.brand[50] },
  whiteBtn: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  whiteBtnText: { color: colors.brand[700], fontWeight: '900', fontSize: 14 },
  gridRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: 14
  },
  statVal: { fontSize: 20, fontWeight: '900', color: colors.navy[900], marginTop: 4 },
  noticeBanner: {
    backgroundColor: colors.blue[50],
    color: colors.blue[700],
    padding: 12,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '800'
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tplChip: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.surface.border,
    paddingHorizontal: 10,
    justifyContent: 'center'
  },
  tplChipText: { fontSize: 12, fontWeight: '800', color: colors.navy[900] },
  modePill: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surface.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modePillActive: { borderColor: colors.blue[500], backgroundColor: colors.blue[50] },
  modePillText: { fontSize: 12, fontWeight: '800', color: colors.navy[900] },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border
  },
  listMain: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.navy[900], paddingRight: 8 },
  listBadge: { fontSize: 13, fontWeight: '900', color: colors.brand[700] }
});
