import React from 'react';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { X, Trash2, Calendar, Award, Code } from 'lucide-react';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose }) => {
  const { history, deleteHistoryItem, selectHistoryEntry } = useAnalysisStore();

  const handleSelectEntry = (entry: any) => {
    selectHistoryEntry(entry);
    onClose(); // Close drawer on selection
  };

  return (
    <>
      {/* Background Dimmer Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-all duration-300"
        />
      )}

      {/* Slide-Over Drawer Container */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-[380px] bg-neutral-950 border-l border-neutral-900 shadow-2xl z-50 transition-transform duration-350 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header section */}
        <div className="flex items-center justify-between px-5 py-4 bg-neutral-900 border-b border-neutral-850">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-cyan-400" />
            <h3 className="text-sm font-semibold tracking-wide font-mono uppercase text-neutral-300">
              Analysis History
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* History List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <Code size={32} className="text-neutral-700 mb-2 animate-pulse" />
              <span className="text-xs font-mono text-neutral-500">History Empty</span>
              <p className="text-[10px] font-mono text-neutral-600 mt-1 max-w-[200px]">
                Past reports and diagnostics will accumulate here as you analyze code blocks.
              </p>
            </div>
          ) : (
            history.map((entry) => {
              const { score } = entry.result;
              
              // Score badge coloring
              let badgeColor = 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20';
              if (score >= 90) badgeColor = 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20';
              else if (score >= 70) badgeColor = 'border-cyan-500/30 text-cyan-400 bg-cyan-950/20';
              else if (score >= 50) badgeColor = 'border-yellow-500/30 text-yellow-400 bg-yellow-950/20';
              else badgeColor = 'border-red-500/30 text-red-400 bg-red-950/20';

              const timestamp = new Date(entry.result.analyzedAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div 
                  key={entry.id}
                  onClick={() => handleSelectEntry(entry)}
                  className="flex flex-col border border-neutral-900 bg-neutral-900/30 hover:bg-neutral-900/60 hover:border-neutral-800 rounded-lg p-3 cursor-pointer group transition-all select-none relative"
                >
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    {/* Score badge & label */}
                    <div className="flex items-center gap-2">
                      <div className={`px-2 py-0.5 border text-[10px] font-mono font-bold rounded ${badgeColor} flex items-center gap-1`}>
                        <Award size={10} />
                        <span>{score}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-neutral-400 truncate max-w-[170px]">
                        {timestamp}
                      </span>
                    </div>

                    {/* Delete action */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Stop parent click selection
                        deleteHistoryItem(entry.id);
                      }}
                      className="p-1 rounded text-neutral-600 hover:text-red-400 hover:bg-neutral-800 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete this history entry"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Code preview snippet */}
                  <div className="bg-black/40 border border-neutral-950 rounded p-2 text-[10px] font-mono text-neutral-500 truncate select-none">
                    {entry.result.codeSnapshot.replace(/\s+/g, ' ')}
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Footer info panel */}
        <div className="px-5 py-3.5 bg-neutral-900 border-t border-neutral-850 text-[10px] font-mono text-neutral-600 flex items-center justify-between">
          <span>Capacity: 10 reports</span>
          <span>Stored locally</span>
        </div>
      </div>
    </>
  );
};
