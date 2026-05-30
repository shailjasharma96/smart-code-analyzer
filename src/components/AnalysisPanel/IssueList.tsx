import React, { useState } from 'react';
import { Issue } from '../../engine/types';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Terminal, 
  CornerDownRight 
} from 'lucide-react';

interface IssueListProps {
  issues: Issue[];
}

export const IssueList: React.FC<IssueListProps> = ({ issues }) => {
  const { setHighlightedLine } = useAnalysisStore();
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);

  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-neutral-900/20 border border-neutral-800/60 rounded-xl">
        <Terminal size={32} className="text-emerald-500 mb-2 animate-pulse" />
        <span className="text-sm font-mono text-neutral-400 font-semibold">Verification Node Clear</span>
        <span className="text-xs font-mono text-neutral-500 mt-1">Zero issues flagged in this iteration scope.</span>
      </div>
    );
  }

  // Group issues by severity
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const warningIssues = issues.filter(i => i.severity === 'warning');
  const infoIssues = issues.filter(i => i.severity === 'info');

  const toggleExpand = (id: string) => {
    setExpandedIssueId(expandedIssueId === id ? null : id);
  };

  const handleLineClick = (e: React.MouseEvent, line?: number) => {
    e.stopPropagation(); // Avoid triggering parent expand toggle
    if (line) {
      setHighlightedLine(line);
    }
  };

  const renderIssueItem = (issue: Issue) => {
    const isExpanded = expandedIssueId === issue.id;
    
    // Styling depending on severity
    let icon = <Info size={15} className="text-blue-400" />;
    let borderClass = 'border-neutral-800/80 hover:border-blue-500/30';
    let bgClass = 'bg-neutral-900/30';
    let tagClass = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    
    if (issue.severity === 'critical') {
      icon = <AlertOctagon size={15} className="text-red-400" />;
      borderClass = 'border-red-950 hover:border-red-500/40';
      bgClass = 'bg-red-950/5';
      tagClass = 'bg-red-500/10 text-red-400 border-red-500/30';
    } else if (issue.severity === 'warning') {
      icon = <AlertTriangle size={15} className="text-yellow-500" />;
      borderClass = 'border-yellow-950 hover:border-yellow-500/40';
      bgClass = 'bg-yellow-950/5';
      tagClass = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    }

    return (
      <div 
        key={issue.id}
        onClick={() => toggleExpand(issue.id)}
        className={`flex flex-col border rounded-lg transition-all overflow-hidden cursor-pointer ${borderClass} ${bgClass} ${isExpanded ? 'shadow-[0_0_10px_rgba(255,255,255,0.02)]' : ''}`}
      >
        {/* Card Header Row */}
        <div className="flex items-center justify-between px-4 py-3 select-none">
          <div className="flex items-center gap-3 min-w-0">
            {icon}
            <span className={`px-2 py-0.5 text-[9px] font-mono font-extrabold uppercase border rounded ${tagClass}`}>
              {issue.severity}
            </span>
            <span className="text-xs font-mono text-neutral-200 font-semibold truncate">
              {issue.message}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {issue.line && (
              <button
                onClick={(e) => handleLineClick(e, issue.line)}
                className="px-2 py-1 bg-neutral-800/80 hover:bg-neutral-800 text-cyan-400 hover:text-cyan-300 border border-neutral-700 text-[10px] font-mono rounded flex items-center gap-1 transition-all"
                title="Click to locate line in editor"
              >
                <span>Line {issue.line}</span>
              </button>
            )}
            {isExpanded ? <ChevronUp size={14} className="text-neutral-500" /> : <ChevronDown size={14} className="text-neutral-500" />}
          </div>
        </div>

        {/* Expandable Body Details */}
        {isExpanded && (
          <div className="px-4 pb-3 pt-1 border-t border-neutral-800/60 bg-neutral-950/40 text-xs font-mono space-y-3.5">
            {/* Explanation Section */}
            <div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-1">
                Why this matters
              </div>
              <p className="text-neutral-400 leading-relaxed pl-2 border-l border-neutral-800">
                {issue.explanation}
              </p>
            </div>
            
            {/* Suggestion Section */}
            <div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-1 flex items-center gap-1">
                <CornerDownRight size={11} className="text-cyan-400" />
                <span>How to resolve</span>
              </div>
              <p className="text-cyan-400/90 leading-relaxed pl-2 border-l border-cyan-500/20">
                {issue.suggestion}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Critical Issues Category */}
      {criticalIssues.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 border-b border-red-950/40 pb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            <h4 className="text-[11px] font-mono font-bold tracking-widest uppercase text-red-400">
              Critical Failures ({criticalIssues.length})
            </h4>
          </div>
          <div className="space-y-2">
            {criticalIssues.map(renderIssueItem)}
          </div>
        </div>
      )}

      {/* Warning Issues Category */}
      {warningIssues.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 border-b border-yellow-950/40 pb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
            <h4 className="text-[11px] font-mono font-bold tracking-widest uppercase text-yellow-500">
              Styling & Smells Warnings ({warningIssues.length})
            </h4>
          </div>
          <div className="space-y-2">
            {warningIssues.map(renderIssueItem)}
          </div>
        </div>
      )}

      {/* Info Issues Category */}
      {infoIssues.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 border-b border-neutral-800 pb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <h4 className="text-[11px] font-mono font-bold tracking-widest uppercase text-neutral-400">
              Optimization Advice ({infoIssues.length})
            </h4>
          </div>
          <div className="space-y-2">
            {infoIssues.map(renderIssueItem)}
          </div>
        </div>
      )}

    </div>
  );
};
