import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { ROLES } from '@edumotion/domain';
import { colors } from '@edumotion/design-tokens';
import { createMobileServiceProvider } from './src/config/mobile-env.js';
import {
  MobileAuthScreen,
  MobileHomeScreen,
  MobileJourneyScreen,
  MobileLeaderboardScreen,
  MobileMasteryScreen,
  MobileParentScreen,
  MobilePracticeExamScreen,
  MobileProfileScreen
} from './src/screens/MobileScreens.jsx';

export function App({ provider = null, initialUser = null }) {
  const [services] = useState(() => provider || createMobileServiceProvider());
  const [user, setUser] = useState(initialUser);
  const [tab, setTab] = useState('home');
  const [activeActivityId, setActiveActivityId] = useState('act_alg_intro');

  const handleAuthenticated = (loggedUser) => {
    setUser(loggedUser);
    setTab(loggedUser.role === ROLES.PARENT ? 'parent' : 'home');
  };

  const handleLogout = async () => {
    await services.auth.logout();
    setUser(null);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.root}>
        <MobileAuthScreen services={services} onAuthenticated={handleAuthenticated} />
      </SafeAreaView>
    );
  }

  const tabs =
    user.role === ROLES.PARENT
      ? [
          { id: 'parent', label: 'Anak' },
          { id: 'profile', label: 'Profil' }
        ]
      : [
          { id: 'home', label: 'Beranda' },
          { id: 'journey', label: 'Journey' },
          { id: 'practice', label: 'Latihan' },
          { id: 'mastery', label: 'Mastery' },
          { id: 'leaderboard', label: 'Liga' },
          { id: 'profile', label: 'Profil' }
        ];

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topHeader}>
        <Text style={styles.topBrand}>EduMotion</Text>
        <Text style={styles.topRole}>{user.displayName}</Text>
      </View>

      <View style={styles.body}>
        {tab === 'home' ? (
          <MobileHomeScreen services={services} user={user} onNavigate={setTab} />
        ) : tab === 'journey' ? (
          <MobileJourneyScreen
            services={services}
            onOpenActivity={(actId) => {
              setActiveActivityId(actId);
              setTab('practice');
            }}
          />
        ) : tab === 'practice' ? (
          <MobilePracticeExamScreen services={services} activityId={activeActivityId} />
        ) : tab === 'mastery' ? (
          <MobileMasteryScreen services={services} />
        ) : tab === 'leaderboard' ? (
          <MobileLeaderboardScreen services={services} />
        ) : tab === 'parent' ? (
          <MobileParentScreen services={services} />
        ) : (
          <MobileProfileScreen user={user} onLogout={handleLogout} />
        )}
      </View>

      <View style={styles.bottomNav}>
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(t.id)}
              style={[styles.navItem, active && styles.navItemActive]}
            >
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.muted, minHeight: '100%' },
  topHeader: {
    height: 54,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  topBrand: { fontSize: 18, fontWeight: '900', color: colors.navy[900] },
  topRole: { fontSize: 12, fontWeight: '800', color: colors.brand[700] },
  body: { flex: 1 },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.surface.border,
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 4
  },
  navItem: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10
  },
  navItemActive: { backgroundColor: colors.brand[50] },
  navLabel: { fontSize: 11, fontWeight: '700', color: colors.text.muted },
  navLabelActive: { color: colors.brand[700], fontWeight: '900' }
});

export default App;
