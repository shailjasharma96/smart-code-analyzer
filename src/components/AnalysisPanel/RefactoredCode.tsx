import React, { useState } from 'react';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { Copy, Check, Sparkles, HelpCircle } from 'lucide-react';

interface RefactoredCodeProps {
  originalCode: string;
  refactoredCode: string;
}

export const RefactoredCode: React.FC<RefactoredCodeProps> = ({ originalCode, refactoredCode }) => {
  const { applyRefactoredCode } = useAnalysisStore();
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(refactoredCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy refactored code:', e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900/20 border border-neutral-800/80 rounded-xl overflow-hidden">
      
      {/* Header Actions */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-900/80 border-b border-neutral-800/60 flex-wrap gap-2.5">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-neutral-200">
            Refactor AI Transformations
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Tabs */}
          <div className="flex items-center bg-neutral-950 p-0.5 rounded border border-neutral-800 text-[10px] font-mono">
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-1 rounded transition-all ${viewMode === 'split' ? 'bg-neutral-800 text-cyan-400 font-semibold' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              Split View
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`px-2 py-1 rounded transition-all ${viewMode === 'unified' ? 'bg-neutral-800 text-cyan-400 font-semibold' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              Full Code
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-750 text-[10px] font-mono rounded transition-all"
          >
            {copied ? (
              <>
                <Check size={11} className="text-emerald-500 animate-scale" />
                <span className="text-emerald-400 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={11} />
                <span>Copy Code</span>
              </>
            )}
          </button>

          {/* Apply Button */}
          <button
            onClick={applyRefactoredCode}
            className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-[10px] font-bold rounded border border-emerald-500/20 shadow-md shadow-emerald-950/20 transition-all"
          >
            <Sparkles size={11} />
            <span>Apply to Editor</span>
          </button>
        </div>
      </div>

      {/* Explanatory Tip */}
      <div className="px-4 py-2 bg-neutral-900/30 border-b border-neutral-800/40 text-[10px] text-neutral-500 font-mono flex items-center gap-1.5">
        <HelpCircle size={12} className="text-neutral-600" />
        <span>Refactoring runs safe local text transforms: resolves var scopes, loose comparison types, env fallbacks, and catch swallowing.</span>
      </div>

      {/* Code Split / Unified Area */}
      <div className="flex-1 min-h-[300px] overflow-auto bg-neutral-950 text-xs font-mono text-neutral-300 leading-normal p-4 relative">
        {viewMode === 'split' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full min-h-[250px]">
            {/* Left: Original Code */}
            <div className="flex flex-col border-r border-neutral-900 pr-3">
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold pb-2 border-b border-neutral-900 mb-3 flex items-center justify-between">
                <span>Original Code</span>
                <span className="text-red-500/80">[-] Outdated Smells</span>
              </div>
              <pre className="flex-1 overflow-auto select-text font-mono text-neutral-500 opacity-90">
                <code>{originalCode}</code>
              </pre>
            </div>

            {/* Right: Refactored Code */}
            <div className="flex flex-col">
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold pb-2 border-b border-neutral-900 mb-3 flex items-center justify-between">
                <span>Refactored Code</span>
                <span className="text-emerald-500/90">[+] Optimized Fixes</span>
              </div>
              <pre className="flex-1 overflow-auto select-text font-mono text-emerald-400/90 font-medium">
                <code>{refactoredCode}</code>
              </pre>
            </div>
          </div>
        ) : (
          <div className="h-full">
            <pre className="overflow-auto select-text font-mono text-emerald-400/90">
              <code>{refactoredCode}</code>
            </pre>
          </div>
        )}
      </div>

    </div>
  );
};
