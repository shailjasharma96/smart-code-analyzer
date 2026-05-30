import { create } from 'zustand';
import { AnalysisResult, HistoryEntry, ThinkingStep } from '../engine/types';
import { analyzeCode } from '../engine/analyzer';

interface AnalysisState {
  code: string;
  isAnalyzing: boolean;
  visibleSteps: number;
  animatingSteps: ThinkingStep[];
  result: AnalysisResult | null;
  history: HistoryEntry[];
  highlightedLine: number | null;
  activeTab: 'summary' | 'suggestions' | 'issues' | 'refactor';
  
  ruleToggles: { [key: string]: boolean };
  toggleRule: (ruleId: string) => void;
  setCode: (code: string) => void;
  setHighlightedLine: (line: number | null) => void;
  setActiveTab: (tab: 'summary' | 'suggestions' | 'issues' | 'refactor') => void;
  loadHistory: () => void;
  deleteHistoryItem: (id: string) => void;
  selectHistoryEntry: (entry: HistoryEntry) => void;
  applyRefactoredCode: () => void;
  triggerAnalysis: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  code: '',
  isAnalyzing: false,
  visibleSteps: 0,
  animatingSteps: [],
  result: null,
  history: [],
  highlightedLine: null,
  activeTab: 'summary',

  ruleToggles: {
    complexity: true,
    naming: true,
    async: true,
    errorHandling: true,
    performance: true,
    security: true,
    bestPractice: true,
    nodeSpecific: true,
    scope: true
  },

  toggleRule: (ruleId: string) => {
    const updated = { ...get().ruleToggles, [ruleId]: !get().ruleToggles[ruleId] };
    set({ ruleToggles: updated });
  },

  setCode: (code: string) => set({ code }),
  
  setHighlightedLine: (line: number | null) => set({ highlightedLine: line }),
  
  setActiveTab: (tab: 'summary' | 'suggestions' | 'issues' | 'refactor') => set({ activeTab: tab }),

  loadHistory: () => {
    try {
      const saved = localStorage.getItem('sca_history');
      if (saved) {
        set({ history: JSON.parse(saved) });
      }
    } catch (e) {
      console.error('Failed to load history from localStorage:', e);
    }
  },

  deleteHistoryItem: (id: string) => {
    const updated = get().history.filter(item => item.id !== id);
    localStorage.setItem('sca_history', JSON.stringify(updated));
    set({ history: updated });
  },

  selectHistoryEntry: (entry: HistoryEntry) => {
    set({
      code: entry.result.refactoredCode && !entry.result.issues.some(i => i.ruleId === 'syntax')
        ? entry.result.refactoredCode 
        : entry.result.codeSnapshot, 
      result: entry.result,
      animatingSteps: entry.result.thinkingTrace,
      highlightedLine: null,
      activeTab: 'summary',
      isAnalyzing: false,
      visibleSteps: entry.result.thinkingTrace.length
    });
  },

  applyRefactoredCode: () => {
    const { result } = get();
    if (result && result.refactoredCode) {
      const updatedResult = { ...result, refactoredCode: undefined };
      set({
        code: result.refactoredCode,
        result: updatedResult,
        activeTab: 'summary'
      });
      
      // Automatically re-run static analysis to calculate the improved score!
      get().triggerAnalysis();
      
      // @ts-ignore
      import('canvas-confetti').then((confetti) => {
        confetti.default({
          particleCount: 50,
          spread: 40,
          origin: { y: 0.8 },
          colors: ['#06b6d4', '#3b82f6']
        });
      });
    }
  },

  triggerAnalysis: () => {
    const { code, ruleToggles } = get();
    if (!code.trim()) return;

    // Collate all active toggled rules
    const enabledRuleIds = Object.keys(ruleToggles).filter(id => ruleToggles[id]);

    // Run our pure analytical pipeline immediately to get steps
    const computedResult = analyzeCode(code, enabledRuleIds);
    const totalSteps = computedResult.thinkingTrace.length;

    // Reset UI state for a new analysis
    set({
      isAnalyzing: true,
      visibleSteps: 0,
      animatingSteps: computedResult.thinkingTrace,
      result: null,
      highlightedLine: null,
      activeTab: 'summary'
    });

    // Sequentially reveal thinking steps in 150ms intervals
    let stepCount = 0;
    const timer = setInterval(() => {
      stepCount++;
      set({ visibleSteps: stepCount });

      if (stepCount >= totalSteps) {
        clearInterval(timer);

        const timeStr = new Date(computedResult.analyzedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const label = `Analysis at ${timeStr} (Score: ${computedResult.score})`;
        
        const historyItem: HistoryEntry = {
          id: `hist-${Date.now()}`,
          result: {
            ...computedResult,
            codeSnapshot: code
          },
          label
        };

        const updatedHistory = [historyItem, ...get().history].slice(0, 10);
        localStorage.setItem('sca_history', JSON.stringify(updatedHistory));

        set({
          result: computedResult,
          isAnalyzing: false,
          history: updatedHistory
        });

        if (computedResult.score >= 90) {
          // @ts-ignore
        import('canvas-confetti').then((confetti) => {
            confetti.default({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.6 },
              colors: ['#10b981', '#06b6d4', '#3b82f6']
            });
          });
        }
      }
    }, 150);
  }
}));
