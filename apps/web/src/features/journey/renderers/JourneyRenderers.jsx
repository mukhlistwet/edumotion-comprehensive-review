import { Check, Lock, Play, Sparkles, Crown } from 'lucide-react';

const STATUS_LABEL_ID = {
  completed: 'Selesai',
  in_progress: 'Sedang berjalan',
  available: 'Tersedia',
  locked: 'Terkunci'
};

function getNodeStatusClasses(status, isSelected, lightSurface = false) {
  const ring = isSelected ? 'ring-4 ring-yellow-400 scale-105' : '';
  if (status === 'completed') {
    return `${ring} border-brand-700 bg-brand-500 text-white`;
  }
  if (status === 'in_progress' || status === 'available') {
    return `${ring} border-blue-700 bg-blue-500 text-white`;
  }
  return lightSurface
    ? `${ring} border-app-border bg-surface-subtle text-text-muted`
    : `${ring} border-white/30 bg-white/15 text-white/75`;
}

function NodeGlyph({ node }) {
  if (node.status === 'completed') return <Check className="h-5 w-5" aria-hidden="true" />;
  if (node.status === 'locked') return <Lock className="h-5 w-5" aria-hidden="true" />;
  if (node.kind === 'boss') return <Crown className="h-5 w-5" aria-hidden="true" />;
  return <Play className="h-4 w-4 fill-current" aria-hidden="true" />;
}

/**
 * 1. Adventure Journey Renderer — winding woodland expedition road with milestone markers
 */
export function AdventureRenderer({ viewModel, selectedNodeId, onSelectNode }) {
  const nodes = viewModel.nodes || [];
  const reduced = viewModel.accessibility?.reducedMotion;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-700 to-lime-600 p-4 text-white sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-lime-200">Alam Hijau Pengetahuan</p>
          <h3 className="font-display text-xl font-black sm:text-2xl">Number Forest · Ekspedisi</h3>
        </div>
        <span className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-extrabold backdrop-blur">
          {viewModel.progress.completedNodes} / {viewModel.progress.totalNodes} Pos
        </span>
      </div>

      <div className="relative mx-auto max-w-2xl space-y-3 py-2">
        {nodes.map((node, idx) => {
          const isCurrent = node.id === viewModel.progress.currentNodeId;
          const isSelected = node.id === selectedNodeId;
          const offsetCls = idx % 2 === 0 ? 'sm:mr-auto sm:w-[82%]' : 'sm:ml-auto sm:w-[82%]';
          return (
            <div key={node.id} className={`flex items-center gap-3 ${offsetCls}`}>
              <button
                type="button"
                onClick={() => onSelectNode(node.id)}
                aria-label={`Checkpoint ${node.sequence}: ${node.title}, status ${STATUS_LABEL_ID[node.status]}`}
                className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${
                  reduced ? '' : 'hover:brightness-110'
                } focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-400 ${
                  isSelected
                    ? 'border-yellow-400 bg-white text-navy-900 shadow-lg'
                    : node.status === 'locked'
                      ? 'border-white/20 bg-emerald-950/45 text-white/80'
                      : 'border-white/40 bg-emerald-950/65 text-white'
                }`}
              >
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-b-4 ${getNodeStatusClasses(node.status, false)}`}>
                  <NodeGlyph node={node} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider opacity-80">
                    <span>Pos {node.sequence}</span>
                    {node.kind === 'boss' ? <span className="rounded bg-purple-500 px-1.5 py-0.5 text-white">BOSS</span> : null}
                    {isCurrent ? <span className="rounded bg-yellow-400 px-1.5 py-0.5 text-navy-900">POS AKTIF</span> : null}
                  </div>
                  <p className="truncate font-display text-sm font-black sm:text-base">{node.title}</p>
                </div>
                <span className="shrink-0 text-xs font-extrabold">{STATUS_LABEL_ID[node.status]}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 2. Board Game Renderer — tile-based quest board grid
 */
export function BoardGameRenderer({ viewModel, selectedNodeId, onSelectNode }) {
  const nodes = viewModel.nodes || [];
  return (
    <div className="rounded-3xl bg-gradient-to-br from-indigo-900 via-blue-800 to-sky-700 p-4 text-white sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-sky-200">Petak Tantangan</p>
          <h3 className="font-display text-xl font-black sm:text-2xl">Math Quest Board</h3>
        </div>
        <span className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-extrabold">
          Papan Petak {nodes.length} Langkah
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {nodes.map((node) => {
          const isSelected = node.id === selectedNodeId;
          const isCurrent = node.id === viewModel.progress.currentNodeId;
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelectNode(node.id)}
              aria-label={`Petak ${node.sequence}: ${node.title}, ${STATUS_LABEL_ID[node.status]}`}
              className={`flex min-h-[116px] flex-col justify-between rounded-2xl border-2 p-3.5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-400 ${
                isSelected
                  ? 'border-yellow-400 bg-white text-navy-900 shadow-lg'
                  : node.status === 'completed'
                    ? 'border-green-300 bg-brand-50 text-navy-900'
                    : node.status === 'available' || node.status === 'in_progress'
                      ? 'border-yellow-300 bg-yellow-50 text-navy-900'
                      : 'border-white/25 bg-white/10 text-white/80'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-black">#{node.sequence}</span>
                <span className={`grid h-8 w-8 place-items-center rounded-xl border ${getNodeStatusClasses(node.status, false, true)}`}>
                  <NodeGlyph node={node} />
                </span>
              </div>
              <div>
                <p className="line-clamp-2 font-display text-sm font-black leading-snug">{node.title}</p>
                <p className="mt-1 text-[11px] font-bold opacity-80">
                  {isCurrent ? 'Posisi pion sekarang' : STATUS_LABEL_ID[node.status]}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 3. World Exploration Renderer — archipelago islands & compass waypoints
 */
export function WorldExplorationRenderer({ viewModel, selectedNodeId, onSelectNode }) {
  const nodes = viewModel.nodes || [];
  return (
    <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-cyan-900 to-teal-800 p-4 text-white sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-teal-200">Ekspedisi Kepulauan</p>
          <h3 className="font-display text-xl font-black sm:text-2xl">The Lost Islands</h3>
        </div>
        <span className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-extrabold">
          Pulau Terbuka: {nodes.filter((n) => n.status !== 'locked').length}/{nodes.length}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {nodes.map((node) => {
          const isSelected = node.id === selectedNodeId;
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelectNode(node.id)}
              aria-label={`Pulau ${node.sequence}: ${node.title}, ${STATUS_LABEL_ID[node.status]}`}
              className={`relative flex min-h-28 flex-col justify-between rounded-3xl border-2 p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-400 ${
                isSelected
                  ? 'border-yellow-400 bg-white text-navy-900'
                  : 'border-teal-300/35 bg-teal-950/60 text-white hover:bg-teal-950/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-extrabold">
                  Pulau {node.sequence}
                </span>
                <span className={`grid h-8 w-8 place-items-center rounded-full border ${getNodeStatusClasses(node.status, false)}`}>
                  <NodeGlyph node={node} />
                </span>
              </div>
              <div className="mt-2">
                <p className="font-display text-sm font-black">{node.title}</p>
                <p className="mt-0.5 text-[11px] font-bold opacity-80">{STATUS_LABEL_ID[node.status]}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 4. Skill Tree Renderer — structured academic dependency tree
 */
export function SkillTreeRenderer({ viewModel, selectedNodeId, onSelectNode }) {
  const nodes = viewModel.nodes || [];
  return (
    <div className="rounded-3xl bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-900 p-4 text-white sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-purple-200">Pohon Keahlian</p>
          <h3 className="font-display text-xl font-black sm:text-2xl">Mastery Constellation</h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-extrabold">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Hierarki Prasyarat
        </span>
      </div>

      <div className="mx-auto flex max-w-xl flex-col items-center">
        {nodes.map((node, idx) => {
          const isSelected = node.id === selectedNodeId;
          return (
            <div key={node.id} className="flex w-full flex-col items-center">
              <button
                type="button"
                onClick={() => onSelectNode(node.id)}
                aria-label={`Simpul ${node.sequence}: ${node.title}, ${STATUS_LABEL_ID[node.status]}`}
                className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-400 ${
                  isSelected
                    ? 'border-yellow-400 bg-white text-navy-900 shadow-lg'
                    : node.status === 'locked'
                      ? 'border-purple-400/30 bg-purple-950/60 text-purple-200'
                      : 'border-purple-300 bg-purple-800/80 text-white'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 ${getNodeStatusClasses(node.status, false)}`}>
                    <NodeGlyph node={node} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider opacity-80">
                      Tier {node.sequence} · {node.kind}
                    </p>
                    <p className="truncate font-display text-sm font-black">{node.title}</p>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-extrabold">{STATUS_LABEL_ID[node.status]}</span>
              </button>
              {idx < nodes.length - 1 ? (
                <div
                  aria-hidden="true"
                  className={`h-5 w-1 rounded-full ${
                    node.status === 'completed' ? 'bg-brand-500' : 'bg-white/25'
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 5. Racing Track Renderer — circuit sectors with lap progress
 */
export function RacingTrackRenderer({ viewModel, selectedNodeId, onSelectNode }) {
  const nodes = viewModel.nodes || [];
  return (
    <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-cyan-800 to-teal-600 p-4 text-white sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-cyan-200">Sirkuit Belajar</p>
          <h3 className="font-display text-xl font-black sm:text-2xl">Formula Circuit · Lap Chapter</h3>
        </div>
        <span className="rounded-xl bg-black/25 px-3 py-1.5 text-xs font-extrabold">
          Sektor {viewModel.progress.completedNodes}/{viewModel.progress.totalNodes}
        </span>
      </div>

      <div className="space-y-2.5">
        {nodes.map((node) => {
          const isSelected = node.id === selectedNodeId;
          const isCurrent = node.id === viewModel.progress.currentNodeId;
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelectNode(node.id)}
              aria-label={`Sektor ${node.sequence}: ${node.title}, ${STATUS_LABEL_ID[node.status]}`}
              className={`flex min-h-13 w-full items-center gap-3 rounded-2xl border-l-8 px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-400 ${
                isSelected
                  ? 'border-l-yellow-400 bg-white text-navy-900'
                  : node.status === 'completed'
                    ? 'border-l-brand-500 bg-slate-950/60 text-white'
                    : isCurrent
                      ? 'border-l-yellow-400 bg-slate-950/80 text-white'
                      : 'border-l-slate-500 bg-slate-950/35 text-white/75'
              }`}
            >
              <span className="w-16 shrink-0 text-xs font-black uppercase tracking-wider">
                {node.kind === 'boss' ? 'FINIS' : `SEK ${node.sequence}`}
              </span>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${getNodeStatusClasses(node.status, false)}`}>
                <NodeGlyph node={node} />
              </span>
              <span className="min-w-0 flex-1 truncate font-display text-sm font-black">{node.title}</span>
              <span className="shrink-0 text-xs font-extrabold">{STATUS_LABEL_ID[node.status]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 6. Galaxy Mission Renderer — planetary orbit waypoints
 */
export function GalaxyMissionRenderer({ viewModel, selectedNodeId, onSelectNode }) {
  const nodes = viewModel.nodes || [];
  return (
    <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-900 p-4 text-white sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-indigo-200">Misi Antariksa</p>
          <h3 className="font-display text-xl font-black sm:text-2xl">Equation Galaxy · Orbit</h3>
        </div>
        <span className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-extrabold">
          Orbit {viewModel.progress.completedNodes}/{viewModel.progress.totalNodes}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {nodes.map((node) => {
          const isSelected = node.id === selectedNodeId;
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelectNode(node.id)}
              aria-label={`Planet ${node.sequence}: ${node.title}, ${STATUS_LABEL_ID[node.status]}`}
              className={`flex min-h-28 flex-col justify-between rounded-3xl border-2 p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-400 ${
                isSelected
                  ? 'border-yellow-400 bg-white text-navy-900'
                  : 'border-indigo-400/35 bg-indigo-950/75 text-white hover:bg-indigo-900/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider opacity-80">
                  Orbit 0{node.sequence}
                </span>
                <span className={`grid h-9 w-9 place-items-center rounded-full border-2 ${getNodeStatusClasses(node.status, false)}`}>
                  <NodeGlyph node={node} />
                </span>
              </div>
              <div className="mt-2">
                <p className="font-display text-sm font-black">{node.title}</p>
                <p className="mt-1 text-[11px] font-bold opacity-80">{STATUS_LABEL_ID[node.status]}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const JOURNEY_RENDERER_REGISTRY = {
  adventure: AdventureRenderer,
  board: BoardGameRenderer,
  explore: WorldExplorationRenderer,
  skill: SkillTreeRenderer,
  racing: RacingTrackRenderer,
  galaxy: GalaxyMissionRenderer
};

export function JourneyTemplateRenderer({ viewModel, selectedNodeId, onSelectNode }) {
  const Renderer = JOURNEY_RENDERER_REGISTRY[viewModel?.template?.id] || AdventureRenderer;
  return (
    <Renderer
      viewModel={viewModel}
      selectedNodeId={selectedNodeId}
      onSelectNode={onSelectNode}
    />
  );
}
