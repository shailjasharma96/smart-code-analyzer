import { Terminal, History, ShieldCheck, HardDrive, Settings } from 'lucide-react';
import { useAnalysisStore } from '../../store/useAnalysisStore';

interface HeaderProps {
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenHistory, onOpenSettings }) => {
  const { history, ruleToggles } = useAnalysisStore();
  const activeRulesCount = Object.values(ruleToggles).filter(Boolean).length;

  return (
    <header className="bg-neutral-950/80 border-b border-neutral-900 px-6 py-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-30">
      
      {/* Branding & Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md shadow-cyan-900/20">
          <Terminal size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-xs font-mono font-extrabold tracking-widest text-white uppercase flex items-center gap-1.5">
            <span>Smart Code Analyzer</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 block animate-ping"></span>
          </h1>
          <div className="flex items-center gap-3 mt-0.5 text-[9px] font-mono text-neutral-500">
            <span className="flex items-center gap-0.5">
              <ShieldCheck size={10} className="text-cyan-500/70" />
              <span>Static Engine Offline</span>
            </span>
            <span className="flex items-center gap-0.5">
              <HardDrive size={10} className="text-emerald-500/70" />
              <span>{activeRulesCount} Rules Active</span>
            </span>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="flex items-center gap-3">
        {/* Rules Config Button */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-cyan-500/30 text-xs font-mono text-neutral-300 rounded-md transition-all shadow-[0_0_10px_rgba(0,0,0,0.2)] group"
        >
          <Settings size={13} className="text-cyan-500 group-hover:rotate-[20deg] transition-all" />
          <span>Rules</span>
        </button>

        {/* History Button */}
        <button
          onClick={onOpenHistory}
          className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-cyan-500/30 text-xs font-mono text-neutral-300 rounded-md transition-all shadow-[0_0_10px_rgba(0,0,0,0.2)] group"
        >
          <History size={13} className="text-cyan-500 group-hover:rotate-[-10deg] transition-all" />
          <span>History</span>
          {history.length > 0 && (
            <span className="flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold text-white bg-cyan-600 rounded-full">
              {history.length}
            </span>
          )}
        </button>
      </div>

    </header>
  );
};
