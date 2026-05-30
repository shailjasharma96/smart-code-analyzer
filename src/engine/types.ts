export type Severity = 'critical' | 'warning' | 'info';

export interface Issue {
  id: string;
  ruleId: string;
  severity: Severity;
  line?: number;
  column?: number;
  message: string;
  explanation: string;       // "Why this matters"
  suggestion: string;        // "How to fix it"
}

export interface ThinkingStep {
  phase: string;             // e.g. "Scanning for async patterns"
  observation: string;
  conclusion: string;
}

export interface AnalysisResult {
  score: number;             // 0–100
  summary: string;           // 2–3 sentence overall assessment
  issues: Issue[];
  suggestions: string[];
  thinkingTrace: ThinkingStep[];
  refactoredCode?: string;   // Optional transformed code
  analyzedAt: number;        // timestamp
  codeSnapshot: string;      // first 200 chars for history preview
}

export interface HistoryEntry {
  id: string;
  result: AnalysisResult;
  label?: string;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  analyze(code: string, lines: string[]): Issue[];
  getThinkingStep(code: string): ThinkingStep;
}
