interface Props {
  total: number;
  current: number;
  policyName: string | null;
}

export default function GenerationProgress({ total, current, policyName }: Props) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="glass-panel p-8 relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl -z-10 -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl -z-10 translate-y-1/2 -translate-x-1/2"></div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Generating Intelligence...
        </h3>
        <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 shadow-sm">
          {Math.round(percent)}%
        </span>
      </div>

      <div className="w-full bg-slate-100/50 backdrop-blur-sm rounded-full h-4 mb-4 shadow-inner border border-slate-200/50 overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 background-size-[200%_auto] animate-shimmer shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          style={{ width: `${percent}%` }}
        >
          {/* Internal neon glare */}
          <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-b from-white/30 to-transparent rounded-full pointer-events-none"></div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500 font-medium">
          {current} of {total} policies
        </span>
        {policyName && (
          <span className="text-slate-600 truncate max-w-[200px] flex items-center gap-1.5" title={policyName}>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            {policyName}
          </span>
        )}
      </div>
    </div>
  );
}
