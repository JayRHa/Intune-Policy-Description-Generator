import { useState, useMemo } from 'react';
import type { Policy } from '../types';
import { POLICY_TYPE_LABELS } from '../types';

interface Props {
  policies: Policy[];
  selectedIds: Set<string>;
  onToggle: (policy: Policy) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export default function PolicyList({ policies, selectedIds, onToggle, onSelectAll, onDeselectAll }: Props) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const policyTypes = useMemo(() => {
    const types = new Set(policies.map((p) => p.policy_type));
    return Array.from(types).sort();
  }, [policies]);

  const filtered = useMemo(() => {
    return policies.filter((p) => {
      const matchesSearch =
        p.display_name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || p.policy_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [policies, search, typeFilter]);

  return (
    <div className="glass-panel overflow-hidden relative group/list">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 opacity-0 group-hover/list:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
      <div className="p-5 border-b border-white/40 bg-white/30 backdrop-blur-md relative z-10">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search policies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-input pl-10"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="glass-input sm:w-48 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.7rem_auto] bg-no-repeat bg-[position:right_1rem_center] pr-10"
          >
            <option value="all">All Types</option>
            {policyTypes.map((t) => (
              <option key={t} value={t}>
                {POLICY_TYPE_LABELS[t] || t}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={onSelectAll}
              className="px-4 py-2 text-sm btn-glass text-blue-700 bg-blue-50/50 hover:bg-blue-100/60 border-blue-200/50"
            >
              Select All
            </button>
            <button
              onClick={onDeselectAll}
              className="px-4 py-2 text-sm btn-glass text-slate-700"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="mt-3 text-xs font-medium text-slate-500 px-1 flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/80 border border-slate-200/50">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            {filtered.length} found
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50/80 text-blue-700 border border-blue-100/50">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            {selectedIds.size} selected
          </span>
        </div>
      </div>

      <div className="overflow-auto max-h-[calc(100vh-320px)] relative">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-20 backdrop-blur-md bg-white/70 border-b border-white/50 shadow-sm">
            <tr>
              <th className="w-12 p-4"></th>
              <th className="text-left p-4 font-semibold text-slate-700 tracking-wide text-xs uppercase">Policy Name</th>
              <th className="text-left p-4 font-semibold text-slate-700 tracking-wide text-xs uppercase">Type</th>
              <th className="text-left p-4 font-semibold text-slate-700 tracking-wide text-xs uppercase">Platform</th>
              <th className="text-left p-4 font-semibold text-slate-700 tracking-wide text-xs uppercase hidden md:table-cell">Description</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((policy) => {
              const key = `${policy.policy_type}:${policy.id}`;
              const isSelected = selectedIds.has(key);
              return (
                <tr
                  key={key}
                  onClick={() => onToggle(policy)}
                  className={`group relative cursor-pointer border-b border-white/20 transition-all duration-200 hover:bg-white/60 ${isSelected ? 'bg-blue-50/50 shadow-[inset_4px_0_0_0_rgba(59,130,246,0.5)]' : ''
                    }`}
                >
                  <td className="p-4 text-center">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        readOnly
                        className="peer w-4 h-4 rounded appearance-none border-2 border-slate-300 checked:bg-blue-500 checked:border-blue-500 transition-colors pointer-events-none"
                      />
                      <svg
                        className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </td>
                  <td className="p-4 font-medium text-slate-900 group-hover:text-blue-700 transition-colors">{policy.display_name}</td>
                  <td className="p-4">
                    <span className="soft-pill bg-purple-50/50 text-purple-700 border-purple-200/50">
                      {POLICY_TYPE_LABELS[policy.policy_type] || policy.policy_type}
                    </span>
                  </td>
                  <td className="p-4">
                    {policy.platform ? (
                      <span className="soft-pill text-slate-600 bg-slate-100/50">
                        {policy.platform}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-500 truncate max-w-xs hidden md:table-cell group-hover:text-slate-700 transition-colors">
                    {policy.description || <span className="italic text-slate-300">No description...</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-white/20 backdrop-blur-sm">
            <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            <p className="font-medium">No policies found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
