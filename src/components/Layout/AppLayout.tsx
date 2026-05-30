import React, { useState, useEffect } from 'react';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { Header } from './Header';
import { CodeEditor } from '../CodeEditor/CodeEditor';
import { SummaryCard } from '../AnalysisPanel/SummaryCard';
import { IssueList } from '../AnalysisPanel/IssueList';
import { RefactoredCode } from '../AnalysisPanel/RefactoredCode';
import { ThinkingTrace } from '../ThinkingTrace/ThinkingTrace';
import { HistoryPanel } from '../HistoryPanel/HistoryPanel';
import { 
  LineChart, 
  AlertTriangle, 
  Sparkles, 
  Terminal, 
  TrendingUp,
  Cpu
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { 
    isAnalyzing, 
    result, 
    loadHistory, 
    activeTab, 
    setActiveTab, 
    code 
  } = useAnalysisStore();
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col antialiased">
      
      {/* Header */}
      <Header onOpenHistory={() => setIsHistoryOpen(true)} />

      {/* Main Grid Layout */}
      <main className="flex-1 max-w-[1536px] w-full mx-auto p-4 lg:p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch overflow-hidden">
        
        {/* Left Column: CodeEditor */}
        <section className="xl:col-span-5 h-[calc(100vh-140px)] min-h-[500px]">
          <CodeEditor />
        </section>

        {/* Right Column: Dynamic Diagnostics Analysis Panel */}
        <section className="xl:col-span-7 h-[calc(100vh-140px)] min-h-[500px] flex flex-col justify-between overflow-hidden">
          
          {/* Case 1: Analyzing (isAnalyzing is true) -> Show Sequential Reasoning Trace */}
          {isAnalyzing && (
            <div className="flex-1 overflow-y-auto animate-fade-in flex flex-col justify-center">
              <div className="max-w-[580px] w-full mx-auto space-y-6 px-4">
                <div className="flex flex-col items-center justify-center text-center space-y-2">
                  <div className="relative w-12 h-12 flex items-center justify-center bg-cyan-950/40 rounded-full border border-cyan-500/20 text-cyan-400">
                    <Cpu size={24} className="animate-spin" />
                    <span className="absolute inset-0 rounded-full border border-cyan-500/40 animate-ping opacity-25"></span>
                  </div>
                  <h3 className="text-sm font-mono font-bold tracking-widest text-white uppercase">
                    Executing Analytical Diagnostics
                  </h3>
                  <p className="text-[11px] font-mono text-neutral-500 max-w-[320px]">
                    Walking the AST node tree recursively and executing static heuristic validation passes...
                  </p>
                </div>
                <ThinkingTrace />
              </div>
            </div>
          )}

          {/* Case 2: Analysis Result is Present and not analyzing -> Show complete Dashboard */}
          {!isAnalyzing && result && (
            <div className="flex-1 flex flex-col h-full overflow-hidden terminal-card neon-border-glow">
              {/* Dashboard Sub-Tabs */}
              <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800/80 select-none flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400"></div>
                  <span className="text-[10px] font-mono font-bold text-neutral-400 tracking-wider uppercase">
                    Diagnostics Console
                  </span>
                </div>
                
                <div className="flex bg-neutral-950 p-0.5 rounded border border-neutral-850 text-xs font-mono">
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all ${activeTab === 'summary' ? 'bg-neutral-800 text-cyan-400 font-semibold' : 'text-neutral-500 hover:text-neutral-300'}`}
                  >
                    <LineChart size={13} />
                    <span>Summary</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('issues')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all relative ${activeTab === 'issues' ? 'bg-neutral-800 text-cyan-400 font-semibold' : 'text-neutral-500 hover:text-neutral-300'}`}
                  >
                    <AlertTriangle size={13} />
                    <span>Issues</span>
                    {result.issues.length > 0 && (
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full absolute top-1 right-1 animate-pulse"></span>
                    )}
                  </button>

                  <button
                    disabled={!result.refactoredCode}
                    onClick={() => setActiveTab('refactor')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all disabled:opacity-30 disabled:pointer-events-none ${activeTab === 'refactor' ? 'bg-neutral-800 text-cyan-400 font-semibold' : 'text-neutral-500 hover:text-neutral-300'}`}
                  >
                    <Sparkles size={13} />
                    <span>Refactor</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Dashboard Body */}
              <div className="flex-1 overflow-y-auto p-4 lg:p-5 bg-neutral-950/20 select-text">
                {activeTab === 'summary' && (
                  <div className="space-y-6 animate-fade-in">
                    <SummaryCard result={result} />
                    
                    {/* Suggestions Section */}
                    <div className="p-4 bg-neutral-900/20 border border-neutral-850 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={16} className="text-cyan-400" />
                        <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-neutral-300">
                          Priority Actionable Suggestions
                        </h4>
                      </div>
                      <ul className="space-y-2.5 font-mono text-[11px] text-neutral-400 pl-1">
                        {result.suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start gap-2.5 leading-relaxed">
                            <span className="text-cyan-500 font-bold select-none">[{index + 1}]</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {activeTab === 'issues' && (
                  <div className="animate-fade-in h-full">
                    <IssueList issues={result.issues} />
                  </div>
                )}

                {activeTab === 'refactor' && result.refactoredCode && (
                  <div className="animate-fade-in h-full">
                    <RefactoredCode 
                      originalCode={code} 
                      refactoredCode={result.refactoredCode} 
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Case 3: Empty state -> Awaiting user to click "Analyze Code" */}
          {!isAnalyzing && !result && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-neutral-800/80 rounded-xl bg-neutral-900/10">
              <div className="w-12 h-12 bg-neutral-900/60 rounded-xl border border-neutral-800 flex items-center justify-center mb-3">
                <Terminal size={22} className="text-neutral-500 animate-pulse" />
              </div>
              <h3 className="text-xs font-mono font-semibold tracking-widest text-neutral-400 uppercase">
                Awaiting Code Analysis
              </h3>
              <p className="text-[11px] font-mono text-neutral-600 text-center max-w-[280px] mt-1.5">
                Load a demo snippet or write JavaScript code inside the editor, then click <strong className="text-cyan-500/80 font-medium">"Analyze Code"</strong> to run heuristics.
              </p>
            </div>
          )}

        </section>

      </main>

      {/* Slide-over Drawer for Local Storage History */}
      <HistoryPanel isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

    </div>
  );
};
