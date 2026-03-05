import { useState, useEffect } from 'react';
import type { Policy } from '../types';
import { POLICY_TYPE_LABELS } from '../types';

interface Props {
  policy: Policy;
  onClose: () => void;
}

export default function PolicyDetail({ policy, onClose }: Props) {
  const [details, setDetails] = useState<object | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/policies/${policy.policy_type}/${policy.id}`)
      .then((r) => r.json())
      .then(setDetails)
      .catch(() => setDetails(null))
      .finally(() => setLoading(false));
  }, [policy]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{policy.display_name}</h2>
            <span className="text-sm text-gray-500">
              {POLICY_TYPE_LABELS[policy.policy_type] || policy.policy_type}
              {policy.platform && ` - ${policy.platform}`}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : details ? (
            <pre className="text-xs font-mono bg-gray-50 p-4 rounded overflow-auto whitespace-pre-wrap">
              {JSON.stringify(details, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-500">Failed to load policy details.</p>
          )}
        </div>
      </div>
    </div>
  );
}
