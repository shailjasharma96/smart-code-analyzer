import React from 'react';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { Terminal, Shield, Cpu, RefreshCw, Layers } from 'lucide-react';

export const ThinkingTrace: React.FC = () => {
  const { isAnalyzing, visibleSteps, animatingSteps } = useAnalysisStore();

  if (!isAnalyzing && animatingSteps.length === 0) {
    return null;
  }

  // Slice steps to only show what is currently animated
  const currentSteps = animatingSteps.slice(0, visibleSteps);
  const totalSteps = animatingSteps.length;
  const progressPercent = Math.min(100, Math.round((visibleSteps / totalSteps) * 100));

  // Determine active scan phase indicator icon
  const getPhaseIcon = (phase: string) => {
    const p = phase.toLowerCase();
    if (p.includes('security')) return <Shield size={13} className="text-red-400 animate-pulse" />;
    if (p.includes('complexity') || p.includes('performance')) return <Cpu size={13} className="text-yellow-400 animate-pulse" />;
    return <Layers size={13} className="text-cyan-400 animate-pulse" />;
  };

  return (
    <div className="flex flex-col border border-neutral-800/80 rounded-xl overflow-hidden bg-black/40 backdrop-blur-md shadow-2xl">
      
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-950/90 border-b border-neutral-900">
        <div className="flex items-center gap-2">
          <Terminal size={15} className="text-cyan-400" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-neutral-400 uppercase">
            Forensics Rule Orchestration Pipeline
          </span>
        </div>

        {isAnalyzing && (
          <div className="flex items-center gap-2">
            <RefreshCw size={11} className="text-cyan-400 animate-spin" />
            <span className="text-[9px] font-mono text-cyan-400 tracking-wide font-semibold uppercase animate-pulse">
              Scanning Node {progressPercent}%
            </span>
          </div>
        )}
      </div>

      {/* Terminal Logs Body */}
      <div className="p-4 space-y-4 font-mono text-xs max-h-[350px] overflow-y-auto bg-neutral-950/80 relative min-h-[140px]">
        {/* Pulsing Active Radar Scanner overlay inside the trace window */}
        {isAnalyzing && (
          <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none overflow-hidden bg-cyan-500/[0.01]">
            <div className="absolute left-0 right-0 h-[1.5px] bg-cyan-400/20 shadow-[0_0_12px_#06b6d4] terminal-scanline"></div>
          </div>
        )}

        {/* Steps History */}
        {currentSteps.map((step, idx) => {
          const isLatest = idx === currentSteps.length - 1 && isAnalyzing;
          return (
            <div 
              key={idx}
              className={`space-y-1 pl-3.5 border-l-2 transition-all duration-300 ${isLatest ? 'border-cyan-500 animate-fade-in' : 'border-neutral-850'}`}
            >
              {/* Header / Phase Title */}
              <div className="flex items-center gap-2 text-neutral-300 font-semibold text-[11px]">
                {getPhaseIcon(step.phase)}
                <span className="text-neutral-400">🔍</span>
                <span className="text-white tracking-wide">{step.phase}</span>
              </div>
              
              {/* Observation Detail */}
              <div className="text-neutral-500 pl-4 flex items-start gap-1">
                <span className="text-cyan-500/70 select-none">❯</span>
                <span className="text-[11px] leading-relaxed text-neutral-400">{step.observation}</span>
              </div>

              {/* Conclusion Detail */}
              <div className="text-neutral-500 pl-4 flex items-start gap-1">
                <span className="text-emerald-500/70 select-none">✓</span>
                <span className="text-[11px] leading-relaxed text-neutral-300 italic">{step.conclusion}</span>
              </div>
            </div>
          );
        })}

        {/* Loading/Scanning placeholder line */}
        {isAnalyzing && visibleSteps < totalSteps && (
          <div className="flex items-center gap-2 pl-3.5 border-l-2 border-dashed border-neutral-800 text-[10px] text-neutral-600 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping"></span>
            <span>Awaiting rule #{visibleSteps + 1} analysis diagnostics...</span>
          </div>
        )}
      </div>

    </div>
  );
};
