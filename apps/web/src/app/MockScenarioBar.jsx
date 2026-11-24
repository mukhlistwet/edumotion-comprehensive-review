import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { useServices } from './ServiceContext.jsx';
import { useAuth, getHomePathForRole } from './AuthSessionContext.jsx';
import { Button, Select } from '../shared/index.js';

export function MockScenarioBar() {
  const { services, showToast } = useServices();
  const { user, personas, switchPersona, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const cfg = services.getConfig();
  if (cfg.adapterMode !== 'mock' || !services.mockControl) return null;

  const scenario = services.mockControl.getScenarioOptions();

  const handlePersonaChange = async (e) => {
    const id = e.target.value;
    if (!id) return;
    await switchPersona(id, (nextUser) => {
      navigate(getHomePathForRole(nextUser.role), { replace: true });
    });
  };

  const handleScenarioChange = (patch) => {
    services.mockControl.setScenarioOptions(patch);
    showToast(`Simulator Mock diperbarui: ${JSON.stringify(patch)}`);
    refreshSession();
  };

  const handleReset = async () => {
    services.mockControl.reset();
    await refreshSession();
    showToast('State mock JSON dikembalikan ke seed awal v1.');
    navigate('/student/dashboard', { replace: true });
  };

  return (
    <div className="fixed right-3 bottom-20 z-40 max-w-xs lg:bottom-4">
      {open ? (
        <section
          aria-label="Simulator Persona & Kondisi Mock"
          className="rounded-2xl border border-navy-700 bg-navy-900 p-4 text-white shadow-2xl space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-yellow-400">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              <span>Simulator Mock Phase 1</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup panel simulator mock"
              className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-1">
            <label htmlFor="sim-persona" className="block text-[11px] font-bold text-slate-300">
              Ganti Persona Aktif ({personas.length} Role)
            </label>
            <Select
              id="sim-persona"
              value={user?.id || ''}
              onChange={handlePersonaChange}
              className="!min-h-10 !bg-white !text-xs !text-navy-900"
            >
              <option value="" disabled>Pilih persona...</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="sim-scenario" className="block text-[11px] font-bold text-slate-300">
                Kondisi API
              </label>
              <Select
                id="sim-scenario"
                value={scenario.forceScenario}
                onChange={(e) => handleScenarioChange({ forceScenario: e.target.value })}
                className="!min-h-9 !bg-white !text-xs !text-navy-900"
              >
                <option value="normal">Normal</option>
                <option value="empty">Empty State</option>
                <option value="server_error">Server Error (500)</option>
                <option value="offline">Offline</option>
                <option value="timeout">Timeout (408)</option>
                <option value="unauthorized">Session Expired (401)</option>
                <option value="forbidden">Forbidden (403)</option>
              </Select>
            </div>
            <div>
              <label htmlFor="sim-clock" className="block text-[11px] font-bold text-slate-300">
                Offset Jam Client
              </label>
              <Select
                id="sim-clock"
                value={String(scenario.clientClockOffsetMs || 0)}
                onChange={(e) => handleScenarioChange({ clientClockOffsetMs: Number(e.target.value) })}
                className="!min-h-9 !bg-white !text-xs !text-navy-900"
              >
                <option value="0">Sinkron (0 mnt)</option>
                <option value="1800000">+30 menit (Uji Timer)</option>
                <option value="-1800000">-30 menit (Uji Timer)</option>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button size="sm" variant="secondary" onClick={handleReset} className="w-full">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset Seed Demo
            </Button>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka simulator persona dan kondisi mock"
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-navy-700 bg-navy-900 px-3.5 py-2 text-xs font-extrabold text-white shadow-lg hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-yellow-400" aria-hidden="true" />
          <span className="hidden sm:inline">Mock: {user ? user.initials : 'Guest'}</span>
          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
