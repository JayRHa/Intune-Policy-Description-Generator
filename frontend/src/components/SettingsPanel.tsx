import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { LLMSettings } from '../types';
import { getSettings, saveSettings } from '../api/client';

interface Props {
  onSettingsChange: (settings: LLMSettings) => void;
}

export default function SettingsPanel({ onSettingsChange }: Props) {
  const [settings, setSettings] = useState<LLMSettings>({
    system_prompt: '',
    template: '',
    custom_instructions: '',
  });
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      onSettingsChange(s);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(settings);
      onSettingsChange(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof LLMSettings, value: string) => {
    const updated = { ...settings, [field]: value };
    setSettings(updated);
    onSettingsChange(updated);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2.5 btn-glass text-slate-600 hover:text-slate-900 group"
        title="LLM Settings"
      >
        <svg className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>

          <div className="glass-panel w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative z-10 overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Background accent glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10 pointer-events-none translate-x-1/2 -translate-y-1/2"></div>

            <div className="p-5 border-b border-white/40 flex items-center justify-between bg-white/40 backdrop-blur-md shrink-0">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Configuration & Models</h2>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/50 rounded-full transition-colors">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700 tracking-wide uppercase text-xs">System Prompt</label>
                <textarea
                  value={settings.system_prompt}
                  onChange={(e) => handleChange('system_prompt', e.target.value)}
                  rows={6}
                  className="glass-input font-mono text-xs leading-relaxed resize-y min-h-[120px]"
                  placeholder="Instructions for the LLM on how to analyze policies..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700 tracking-wide uppercase text-xs">
                  Output Template
                  <span className="font-normal text-slate-400 ml-2 normal-case">
                    Available variables: <code className="px-1 py-0.5 bg-slate-100 rounded text-[10px] text-blue-600 font-mono">{'{policy_name}'}</code>, <code className="px-1 py-0.5 bg-slate-100 rounded text-[10px] text-blue-600 font-mono">{'{policy_type}'}</code>, <code className="px-1 py-0.5 bg-slate-100 rounded text-[10px] text-blue-600 font-mono">{'{platform}'}</code>, <code className="px-1 py-0.5 bg-slate-100 rounded text-[10px] text-blue-600 font-mono">{'{description}'}</code>
                  </span>
                </label>
                <textarea
                  value={settings.template}
                  onChange={(e) => handleChange('template', e.target.value)}
                  rows={4}
                  className="glass-input font-mono text-xs leading-relaxed resize-y"
                  placeholder="Markdown template for the generated description..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700 tracking-wide uppercase text-xs">Custom Instructions</label>
                <textarea
                  value={settings.custom_instructions}
                  onChange={(e) => handleChange('custom_instructions', e.target.value)}
                  rows={3}
                  className="glass-input font-mono text-xs leading-relaxed resize-y"
                  placeholder="Additional specific instructions appended to the system prompt..."
                />
              </div>
            </div>

            <div className="p-5 border-t border-white/40 bg-white/40 backdrop-blur-md flex justify-end gap-3 items-center shrink-0">
              {saved && (
                <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved successfully
                </span>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2.5 text-sm font-medium btn-glass text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 text-sm btn-primary-glass flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Saving...
                  </>
                ) : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
