import { AnalysisResult, Issue, ThinkingStep } from './types';
import { rules } from './rules';
import { calculateScore } from './scoring';
import { refactorEngine } from './refactor/refactorEngine';
import * as acorn from 'acorn';

export function analyzeCode(code: string): AnalysisResult {
  const lines = code.split('\n');
  const analyzedAt = Date.now();
  const codeSnapshot = code.substring(0, 200) + (code.length > 200 ? '...' : '');

  let allIssues: Issue[] = [];
  let thinkingTrace: ThinkingStep[] = [];
  let refactoredCode = '';

  // 1. Check for global syntax validation first
  let isSyntaxValid = true;
  let syntaxErrorDetails: { message: string; line: number; column: number } | null = null;

  try {
    acorn.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
    });
  } catch (err: any) {
    isSyntaxValid = false;
    // Extract line/column from acorn error (typically format: "Message (line:col)")
    const match = err.message.match(/\((\d+):(\d+)\)/);
    const line = match ? parseInt(match[1], 10) : 1;
    const col = match ? parseInt(match[2], 10) : 0;
    
    syntaxErrorDetails = {
      message: err.message.replace(/\(\d+:\d+\)/, '').trim(),
      line,
      column: col
    };
  }

  if (!isSyntaxValid && syntaxErrorDetails) {
    // Return immediately or populate a special critical issue list
    // An unparseable file is a critical failure. Let's record it!
    const syntaxIssue: Issue = {
      id: `syntax-fatal-${Date.now()}`,
      ruleId: 'syntax',
      severity: 'critical',
      line: syntaxErrorDetails.line,
      column: syntaxErrorDetails.column,
      message: `Fatal Compilation / Syntax Error: ${syntaxErrorDetails.message}`,
      explanation: 'The static analysis engine could not parse the code structure because it contains invalid JavaScript syntax. This blocks subsequent AST rule traversals.',
      suggestion: `Fix the syntax error at line ${syntaxErrorDetails.line}, col ${syntaxErrorDetails.column} (such as checking for unmatched braces, parentheses, or trailing symbols).`
    };

    allIssues.push(syntaxIssue);
    thinkingTrace.push({
      phase: 'Initial Syntax Verification',
      observation: `Critical syntax validation failed: ${syntaxErrorDetails.message} at line ${syntaxErrorDetails.line}:${syntaxErrorDetails.column}`,
      conclusion: 'Fatal parsing bottleneck. Aborting rule-based AST traversals to prevent incorrect evaluations.'
    });

    // Provide default thinking steps for other rules to maintain a full trace list
    rules.forEach(rule => {
      thinkingTrace.push({
        phase: rule.name,
        observation: 'Rule execution bypassed due to prior compilation failure.',
        conclusion: 'N/A - Fix syntax errors to activate rules.'
      });
    });

    const scoreDetails = calculateScore(allIssues);

    return {
      score: scoreDetails.score,
      summary: `Syntax validation failed on line ${syntaxErrorDetails.line}. Static code analysis is suspended until the JavaScript parser can successfully read the document tree.`,
      issues: allIssues,
      suggestions: ['Resolve the fatal syntax/compiler error highlighted in the editor.'],
      thinkingTrace,
      refactoredCode: code, // No refactor if syntax is broken
      analyzedAt,
      codeSnapshot
    };
  }

  // 2. Normal execution pipeline
  // Run all rules in sequence to collect issues
  allIssues = rules.flatMap(rule => {
    try {
      return rule.analyze(code, lines);
    } catch (e) {
      console.error(`Rule '${rule.id}' failed during analysis:`, e);
      return [];
    }
  });

  // Collect step-by-step thinking trace per rule
  thinkingTrace = rules.map(rule => {
    try {
      return rule.getThinkingStep(code);
    } catch (e) {
      return {
        phase: rule.name,
        observation: 'An internal error occurred during reasoning calculations.',
        conclusion: 'Bypassed calculation node.'
      };
    }
  });

  // Calculate final score breakdown
  const scoreDetails = calculateScore(allIssues);

  // Apply safe refactoring engines
  try {
    refactoredCode = refactorEngine.apply(code, allIssues);
  } catch (e) {
    console.error('Refactoring engine encountered error:', e);
    refactoredCode = code;
  }

  return {
    score: scoreDetails.score,
    summary: scoreDetails.summary,
    issues: allIssues,
    suggestions: scoreDetails.suggestions,
    thinkingTrace,
    refactoredCode: refactoredCode !== code ? refactoredCode : undefined,
    analyzedAt,
    codeSnapshot
  };
}
