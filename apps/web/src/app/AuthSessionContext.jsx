import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ROLES, hasPermission } from '@edumotion/domain';
import { useServices } from './ServiceContext.jsx';

const AuthContext = createContext(null);

export function getHomePathForRole(role) {
  if (role === ROLES.STUDENT) return '/student/dashboard';
  if (role === ROLES.PARENT) return '/school/parent';
  if ([ROLES.CONTENT_AUTHOR, ROLES.REVIEWER, ROLES.PUBLISHER].includes(role)) return '/studio';
  if ([ROLES.PLATFORM_SUPER_ADMIN, ROLES.PLATFORM_CURRICULUM_ADMIN].includes(role)) return '/admin/dashboard';
  return '/school/dashboard';
}

export function AuthSessionProvider({ children, initialAutoLoad = true }) {
  const { services, showToast } = useServices();
  const [user, setUser] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(initialAutoLoad);
  const [sessionExpiredFlag, setSessionExpiredFlag] = useState(false);
  const [pendingRedirectPath, setPendingRedirectPath] = useState(null);

  const clearPendingRedirect = useCallback(() => setPendingRedirectPath(null), []);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const [sess, personaList] = await Promise.all([
        services.auth.getSession(),
        services.auth.listPersonas().catch(() => [])
      ]);
      setUser(sess.authenticated ? sess.user : null);
      setPersonas(personaList);
      setSessionExpiredFlag(false);
    } catch (err) {
      if (err?.status === 401) {
        setUser(null);
        setSessionExpiredFlag(true);
      }
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    if (initialAutoLoad) refreshSession();
  }, [initialAutoLoad, refreshSession]);

  const loginWithCredentials = useCallback(
    async (creds) => {
      const res = await services.auth.loginWithCredentials(creds);
      setPendingRedirectPath(null);
      setUser(res.user);
      setSessionExpiredFlag(false);
      showToast(`Selamat datang, ${res.user.displayName}`);
      return res.user;
    },
    [services, showToast]
  );

  const switchPersona = useCallback(
    async (userId, onCommit) => {
      const res = await services.auth.loginAsPersona(userId);
      const targetPath = getHomePathForRole(res.user.role);
      setPendingRedirectPath(targetPath);
      setUser(res.user);
      setSessionExpiredFlag(false);
      if (typeof onCommit === 'function') {
        onCommit(res.user, targetPath);
      }
      showToast(`Beralih ke persona: ${res.user.displayName}`);
      return res.user;
    },
    [services, showToast]
  );

  const logout = useCallback(async () => {
    await services.auth.logout();
    setPendingRedirectPath(null);
    setUser(null);
    showToast('Anda telah keluar dari sesi.');
  }, [services, showToast]);

  const can = useCallback(
    (permission) => hasPermission(user, permission),
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      setUser,
      personas,
      loading,
      sessionExpiredFlag,
      pendingRedirectPath,
      clearPendingRedirect,
      refreshSession,
      loginWithCredentials,
      switchPersona,
      logout,
      can
    }),
    [
      user,
      personas,
      loading,
      sessionExpiredFlag,
      pendingRedirectPath,
      clearPendingRedirect,
      refreshSession,
      loginWithCredentials,
      switchPersona,
      logout,
      can
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthSessionProvider');
  return ctx;
}
