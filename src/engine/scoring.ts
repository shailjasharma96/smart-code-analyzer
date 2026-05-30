import { Issue } from './types';

export interface ScoreBreakdown {
  score: number;
  grade: 'Excellent' | 'Good' | 'Needs Improvement' | 'Poor';
  colorClass: string;
  summary: string;
  radarData: { subject: string; value: number; fullMark: number }[];
  suggestions: string[];
}

export function calculateScore(issues: Issue[]): ScoreBreakdown {
  // 1. Calculate main score deductions
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  const criticalDeductions = Math.min(criticalCount * 15, 45);
  const warningDeductions = Math.min(warningCount * 5, 25);
  const infoDeductions = Math.min(infoCount * 1, 10);

  const rawScore = 100 - (criticalDeductions + warningDeductions + infoDeductions);
  const score = Math.max(0, rawScore);

  // 2. Grade and colors
  let grade: 'Excellent' | 'Good' | 'Needs Improvement' | 'Poor' = 'Excellent';
  let colorClass = 'text-green-400 border-green-500';

  if (score >= 90) {
    grade = 'Excellent';
    colorClass = 'text-emerald-400 border-emerald-500 bg-emerald-500/10';
  } else if (score >= 70) {
    grade = 'Good';
    colorClass = 'text-cyan-400 border-cyan-500 bg-cyan-500/10';
  } else if (score >= 50) {
    grade = 'Needs Improvement';
    colorClass = 'text-yellow-500 border-yellow-500 bg-yellow-500/10';
  } else {
    grade = 'Poor';
    colorClass = 'text-red-500 border-red-500 bg-red-500/10';
  }

  // 3. Compute 5-axis scores for Radar Chart (0-100 range)
  // Categories: Security, Complexity, Naming, Best Practices, Robustness & Perf
  let securityDeduction = 0;
  let complexityDeduction = 0;
  let namingDeduction = 0;
  let bestPracticeDeduction = 0;
  let robustnessDeduction = 0;

  issues.forEach(i => {
    let weight = 5;
    if (i.severity === 'critical') weight = 20;
    else if (i.severity === 'warning') weight = 10;
    else weight = 2;

    switch (i.ruleId) {
      case 'security':
        securityDeduction += weight;
        break;
      case 'complexity':
        complexityDeduction += weight;
        break;
      case 'naming':
        namingDeduction += weight;
        break;
      case 'bestPractice':
        bestPracticeDeduction += weight;
        break;
      case 'async':
      case 'errorHandling':
      case 'performance':
      case 'nodeSpecific':
        robustnessDeduction += weight;
        break;
    }
  });

  const radarData = [
    { subject: 'Security', value: Math.max(20, 100 - securityDeduction), fullMark: 100 },
    { subject: 'Complexity', value: Math.max(20, 100 - complexityDeduction), fullMark: 100 },
    { subject: 'Naming', value: Math.max(20, 100 - namingDeduction), fullMark: 100 },
    { subject: 'Best Practices', value: Math.max(20, 100 - bestPracticeDeduction), fullMark: 100 },
    { subject: 'Robustness & Perf', value: Math.max(20, 100 - robustnessDeduction), fullMark: 100 },
  ];

  // 4. Generate dynamic summary
  let summary = '';
  if (score >= 90) {
    summary = 'The code is exceptionally clean and matches senior engineering standards. Best practices are strictly adhered to, variables are highly descriptive, and there are no architectural blocking patterns or security flaws.';
  } else if (score >= 70) {
    const mainConcerns: string[] = [];
    if (criticalCount > 0) mainConcerns.push(`${criticalCount} critical severity flags`);
    if (warningCount > 0) mainConcerns.push(`${warningCount} code styling warnings`);
    
    summary = `The codebase is solid but has areas for improvement, particularly involving ${mainConcerns.join(' and ')}. Structural integrity is strong, but implementing strict variable checks or wrapping operational scopes will make the application highly reliable.`;
  } else if (score >= 50) {
    summary = `Code health is compromised. Multiple code smells, loose comparisons, and unhandled promise awaits degrade maintenance metrics. A structured refactor is recommended to resolve error-swallowing catch blocks and nested logic.`;
  } else {
    summary = `Critical warning: The analyzed code contains high-priority security concerns, silent catch rejections, or O(N²) quadratic loops. This should not be deployed to production in its current state as it is vulnerable to runtime crashes and execution injection.`;
  }

  // 5. Derive actionable suggestions
  const suggestions: string[] = [];
  if (issues.some(i => i.ruleId === 'security')) {
    suggestions.push('Scrub plain-text API secrets and utilize parameterized queries for database execution.');
  }
  if (issues.some(i => i.ruleId === 'complexity')) {
    suggestions.push('Modularize compound logic loops and partition code into dedicated helper functions.');
  }
  if (issues.some(i => i.ruleId === 'async')) {
    suggestions.push('Flatten callback indentations. Transition legacy callback interfaces to Promises or async/await.');
  }
  if (issues.some(i => i.ruleId === 'errorHandling')) {
    suggestions.push('Ensure catch blocks actively log errors, and wrap asynchronous awaits inside try/catch frames.');
  }
  if (issues.some(i => i.ruleId === 'performance')) {
    suggestions.push('De-nest matching iterations. Swap O(N²) nested arrays with fast Hash Map lookups.');
  }
  if (issues.some(i => i.ruleId === 'bestPractice')) {
    suggestions.push("Upgrade legacy 'var' keywords to block-scoped 'const' or 'let' and use strict triple-equals.");
  }
  if (issues.some(i => i.ruleId === 'nodeSpecific')) {
    suggestions.push('Use modern ESM imports instead of require(), and provide logical fallback values for environment variables.');
  }

  // Fallback suggestions if code is already perfect
  if (suggestions.length === 0) {
    suggestions.push('Add comprehensive TypeScript interfaces to enforce absolute type-safety.');
    suggestions.push('Introduce strict Jest/Vitest automated unit tests to secure complete branch coverage.');
  }

  return {
    score,
    grade,
    colorClass,
    summary,
    radarData,
    suggestions: suggestions.slice(0, 4) // Return top 4 unique actionable suggestions
  };
}
