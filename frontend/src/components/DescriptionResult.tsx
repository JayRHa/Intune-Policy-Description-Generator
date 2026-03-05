import { useState } from 'react';
import type { GenerationResult } from '../types';
import { POLICY_TYPE_LABELS } from '../types';
import { updateDescriptionsInIntune } from '../api/client';

interface Props {
  results: GenerationResult[];
  errors: { policy_id: string; error: string }[];
  onBack: () => void;
}

export default function DescriptionResult({ results, errors, onBack }: Props) {
  const [editedDescriptions, setEditedDescriptions] = useState<Record<string, string>>(
    () => Object.fromEntries(results.map((r) => [r.policy_id, r.generated_description]))
  );
  const [selectedForUpdate, setSelectedForUpdate] = useState<Set<string>>(new Set());
  const [updatedIds, setUpdatedIds] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState(false);
  const [updateResults, setUpdateResults] = useState<{
    success: number;
    errors: { policy_id: string; policy_name: string; error: string }[];
  } | null>(null);

  const toggleSelect = (policyId: string) => {
    setSelectedForUpdate((prev) => {
      const next = new Set(prev);
      if (next.has(policyId)) next.delete(policyId);
      else next.add(policyId);
      return next;
    });
  };

  const selectAllForUpdate = () => {
    setSelectedForUpdate(new Set(results.filter((r) => !updatedIds.has(r.policy_id)).map((r) => r.policy_id)));
  };

  const deselectAllForUpdate = () => {
    setSelectedForUpdate(new Set());
  };

  const handleDescriptionChange = (policyId: string, value: string) => {
    setEditedDescriptions((prev) => ({ ...prev, [policyId]: value }));
  };

  const handleUpdateInIntune = async () => {
    const updates = results
      .filter((r) => selectedForUpdate.has(r.policy_id))
      .map((r) => ({
        policy_id: r.policy_id,
        policy_type: r.policy_type,
        description: editedDescriptions[r.policy_id] || r.generated_description,
      }));

    if (updates.length === 0) return;

    setUpdating(true);
    try {
      const data = await updateDescriptionsInIntune(updates);
      const successIds = new Set(updatedIds);
      // Mark successfully updated policies
      const errorPolicyIds = new Set(data.errors.map((e: any) => e.policy_id));
      updates.forEach((u) => {
        if (!errorPolicyIds.has(u.policy_id)) {
          successIds.add(u.policy_id);
        }
      });
      setUpdatedIds(successIds);
      // Deselect successfully updated ones
      setSelectedForUpdate((prev) => {
        const next = new Set(prev);
        successIds.forEach((id) => next.delete(id));
        return next;
      });
      setUpdateResults({
        success: data.results.length,
        errors: data.errors.map((e: any) => ({
          ...e,
          policy_name: results.find((r) => r.policy_id === e.policy_id)?.policy_name || e.policy_id,
        })),
      });
    } catch (e: any) {
      setUpdateResults({
        success: 0,
        errors: [{ policy_id: '', policy_name: 'General Error', error: e.message }],
      });
    } finally {
      setUpdating(false);
    }
  };

  const exportMarkdown = () => {
    const content = results
      .map((r) => `# ${r.policy_name}\n\n${editedDescriptions[r.policy_id] || r.generated_description}`)
      .join('\n\n---\n\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'intune-policy-descriptions.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onBack}
            className="p-2.5 btn-glass text-slate-500 hover:text-slate-900 group"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              Generated Descriptions
              <span className="soft-pill bg-blue-100/50 text-blue-700 border-blue-200/50 text-[10px] leading-tight px-2 py-0.5">
                {results.length} total
              </span>
            </h2>
          </div>
          {updatedIds.size > 0 && (
            <span className="px-3 py-1 text-xs rounded-full bg-emerald-500 text-white font-medium shadow-sm shadow-emerald-500/20 flex items-center gap-1.5 animate-in zoom-in ml-auto sm:ml-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {updatedIds.size} synced
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={selectAllForUpdate}
            className="px-4 py-2 text-sm btn-glass text-blue-700 bg-blue-50/50 hover:bg-blue-100/60 border-blue-200/50"
          >
            Select All
          </button>
          <button
            onClick={deselectAllForUpdate}
            className="px-4 py-2 text-sm btn-glass text-slate-700"
          >
            Clear
          </button>
          <button
            onClick={exportMarkdown}
            className="px-4 py-2 text-sm btn-glass text-slate-700 flex items-center gap-2 group"
          >
            <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button
            onClick={handleUpdateInIntune}
            disabled={updating || selectedForUpdate.size === 0}
            className="px-5 py-2 text-sm btn-primary-glass bg-emerald-600/90 hover:bg-emerald-600 border-emerald-500/50 shadow-emerald-500/20 hover:shadow-emerald-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Sync to Intune ({selectedForUpdate.size})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Update Result Banner */}
      {updateResults && (
        <div className={`glass-panel p-4 animate-in slide-in-from-top-2 ${updateResults.errors.length > 0 ? 'bg-amber-50/80 border-amber-200/50' : 'bg-emerald-50/80 border-emerald-200/50'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className={`p-2 rounded-full mt-0.5 ${updateResults.errors.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {updateResults.errors.length > 0 ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                {updateResults.success > 0 && (
                  <p className="text-sm text-emerald-800 font-medium">
                    Successfully synchronized {updateResults.success} {updateResults.success === 1 ? 'policy' : 'policies'} to Intune.
                  </p>
                )}
                {updateResults.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {updateResults.errors.map((e, i) => (
                      <p key={i} className="text-sm text-amber-800">
                        <span className="font-medium">{e.policy_name}:</span> {e.error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setUpdateResults(null)}
              className="p-1.5 hover:bg-black/5 rounded-md transition-colors text-slate-400 hover:text-slate-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Errors from generation */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-800 mb-2">Generation Errors ({errors.length})</h3>
          {errors.map((e, i) => (
            <p key={i} className="text-sm text-red-700">
              Policy {e.policy_id}: {e.error}
            </p>
          ))}
        </div>
      )}

      {/* Results with Before/After */}
      <div className="grid gap-6">
        {results.map((result) => {
          const isSelected = selectedForUpdate.has(result.policy_id);
          const isUpdated = updatedIds.has(result.policy_id);
          return (
            <div
              key={result.policy_id}
              className={`glass-panel transition-all duration-300 relative overflow-hidden group ${isUpdated ? 'bg-emerald-50/40 border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : isSelected ? 'border-blue-400/60 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-400/20' : 'hover:shadow-glass hover:-translate-y-0.5'
                }`}
            >
              {isUpdated && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/20 blur-3xl -z-10 rounded-full translate-x-1/2 -translate-y-1/2"></div>
              )}
              <div
                className="p-5 border-b border-white/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-white/50 transition-colors"
                onClick={() => !isUpdated && toggleSelect(result.policy_id)}
              >
                <div className="flex items-center gap-4">
                  {!isUpdated && (
                    <div className="relative flex items-center justify-center shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="peer w-5 h-5 rounded appearance-none border-2 border-slate-300 checked:bg-blue-500 checked:border-blue-500 transition-colors pointer-events-none"
                      />
                      <svg
                        className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {isUpdated && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-800 transition-colors text-lg tracking-tight">{result.policy_name}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="soft-pill bg-purple-50/60 text-purple-700 border-purple-200/50">
                        {POLICY_TYPE_LABELS[result.policy_type] || result.policy_type}
                      </span>
                      {isUpdated && (
                        <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                          Synced successfully
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-5 bg-white/20 backdrop-blur-sm">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Before */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Original Description
                    </label>
                    <div className="w-full px-4 py-3 border border-slate-200/60 rounded-xl text-sm bg-slate-100/50 text-slate-600 min-h-[140px] whitespace-pre-wrap leading-relaxed shadow-inner">
                      {result.original_description || <span className="italic text-slate-400 flex h-full items-center justify-center py-6">No previous description found</span>}
                    </div>
                  </div>
                  {/* After */}
                  <div className="space-y-2 focus-within:relative z-10">
                    <label className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Generated Description
                    </label>
                    <textarea
                      value={editedDescriptions[result.policy_id] || ''}
                      onChange={(e) => handleDescriptionChange(result.policy_id, e.target.value)}
                      rows={6}
                      disabled={isUpdated}
                      className={`glass-input resize-y min-h-[140px] leading-relaxed shadow-sm ${isUpdated ? 'bg-emerald-50/50 border-emerald-200/50 text-emerald-900 focus:ring-0 cursor-not-allowed' : 'bg-white/70 focus:bg-white focus:shadow-md'
                        }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
