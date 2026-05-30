import React, { useState, useEffect } from 'react';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { Header } from './Header';
import { CodeEditor } from '../CodeEditor/CodeEditor';
import { SummaryCard } from '../AnalysisPanel/SummaryCard';
import { IssueList } from '../AnalysisPanel/IssueList';
import { RefactoredCode } from '../AnalysisPanel/RefactoredCode';
import { ThinkingTrace } from '../ThinkingTrace/ThinkingTrace';
import { HistoryPanel } from '../HistoryPanel/HistoryPanel';
import { RulesConfigPanel } from '../RulesConfigPanel/RulesConfigPanel';
import { 
  LineChart, 
  AlertTriangle, 
  Sparkles, 
  Terminal, 
  Cpu,
  Lightbulb
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col antialiased">
      
      {/* Header */}
      <Header onOpenHistory={() => setIsHistoryOpen(true)} onOpenSettings={() => setIsSettingsOpen(true)} />

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
              {result.issues.some(i => i.ruleId === 'syntax') ? (
                /* Syntax Compilation Blocked Frame */
                <div className="flex-1 p-5 flex flex-col overflow-y-auto space-y-5 bg-red-950/[0.02] animate-fade-in border border-red-500/10 rounded-xl">
                  <div className="flex flex-col items-center justify-center text-center p-5 bg-red-950/10 border border-red-500/20 rounded-xl">
                    <div className="w-11 h-11 bg-red-900/20 text-red-500 rounded-full border border-red-500/30 flex items-center justify-center mb-2.5 animate-pulse">
                      <AlertTriangle size={20} />
                    </div>
                    <h3 className="text-xs font-mono font-extrabold tracking-widest text-red-400 uppercase">
                      Syntax Verification Blocked
                    </h3>
                    <p className="text-[11px] font-mono text-neutral-400 max-w-[420px] mt-1.5 leading-relaxed">
                      The analyzer engine could not parse the code structure because it is not valid JavaScript syntax. In-depth quality audits and score charts have been suspended.
                    </p>
                  </div>
                  
                  <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-4 font-mono text-xs text-red-400/90 leading-relaxed shadow-inner">
                    <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-2">
                      Compiler Exception Output
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-500 font-bold select-none">❯</span>
                      <div>
                        <span className="font-bold text-neutral-200">{result.issues[0].message}</span>
                        {result.issues[0].line && (
                          <div className="text-[10px] text-neutral-500 mt-1 font-semibold">
                            Location: Line {result.issues[0].line}, Column {result.issues[0].column || 0}
                          </div>
                        )}
                        <div className="text-cyan-400/85 mt-2.5 pl-2.5 border-l-2 border-cyan-500/30 leading-normal">
                          <strong>Suggestion:</strong> {result.issues[0].suggestion}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Render the logs showing the scan stopped */}
                  <div className="border border-neutral-900/80 rounded-lg overflow-hidden">
                    <ThinkingTrace />
                  </div>
                </div>
              ) : (
                /* Standard Quality Diagnostics Dashboard */
                <>
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
                        onClick={() => setActiveTab('suggestions')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all relative ${activeTab === 'suggestions' ? 'bg-neutral-800 text-cyan-400 font-semibold' : 'text-neutral-500 hover:text-neutral-300'}`}
                      >
                        <Lightbulb size={13} />
                        <span>Suggestions</span>
                        {result.suggestions.length > 0 && (
                          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full absolute top-1 right-1 animate-pulse"></span>
                        )}
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
                        
                        {/* Quick Suggestions Link Card */}
                        <div 
                          onClick={() => setActiveTab('suggestions')}
                          className="p-4 bg-neutral-900/25 border border-neutral-850 hover:border-cyan-500/20 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2.5">
                            <Lightbulb size={16} className="text-cyan-400 group-hover:animate-bounce" />
                            <div>
                              <h4 className="text-[11px] font-mono font-bold tracking-wider uppercase text-neutral-300">
                                View Actionable Priority Suggestions
                              </h4>
                              <p className="text-[10px] font-mono text-neutral-500 mt-0.5">
                                {result.suggestions.length} recommendations generated to optimize this file.
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-cyan-400 group-hover:translate-x-1 transition-all">
                            Open Tab &rarr;
                          </span>
                        </div>
                      </div>
                    )}

                    {activeTab === 'suggestions' && (
                      <div className="space-y-6 animate-fade-in">
                        {/* Priority Actionable Suggestions Panel */}
                        <div className="p-5 bg-neutral-900/20 border border-neutral-850 rounded-xl space-y-4">
                          <div className="flex items-center gap-2.5 border-b border-neutral-800 pb-3">
                            <Lightbulb size={18} className="text-cyan-400 animate-pulse" />
                            <div>
                              <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-neutral-200">
                                Priority Actionable Suggestions
                              </h4>
                              <p className="text-[10px] font-mono text-neutral-500 mt-0.5">
                                Critical actions to optimize performance, security, architecture, and styling.
                              </p>
                            </div>
                          </div>
                          
                          {result.suggestions.length > 0 ? (
                            <ul className="space-y-3 pl-1">
                              {result.suggestions.map((suggestion, index) => (
                                <li 
                                  key={index} 
                                  className="flex items-start gap-3.5 text-[11px] font-mono text-neutral-355 leading-relaxed group p-3 bg-neutral-950/45 border border-neutral-900 hover:border-cyan-500/10 hover:bg-neutral-900/10 rounded-lg transition-all"
                                >
                                  <span className="flex items-center justify-center w-5 h-5 bg-neutral-900 border border-neutral-800 text-cyan-400 rounded text-[9.5px] font-bold select-none group-hover:border-cyan-500/30 transition-all shrink-0">
                                    0{index + 1}
                                  </span>
                                  <span className="flex-1 mt-0.5 group-hover:text-cyan-300/90 transition-all">
                                    {suggestion}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="flex flex-col items-center justify-center p-8 bg-neutral-900/10 border border-dashed border-neutral-800/85 rounded-lg">
                              <Lightbulb size={24} className="text-neutral-600 mb-2" />
                              <span className="text-[11px] font-mono text-neutral-500">
                                No suggestions recorded. Code architecture complies with active standards.
                              </span>
                            </div>
                          )}
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
                </>
              )}
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

      {/* Slide-over Drawer for Rules Configuration Settings */}
      <RulesConfigPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

    </div>
  );
};
