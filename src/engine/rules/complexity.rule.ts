import { Rule, Issue, ThinkingStep } from '../types';
import { parseAST, walkAST } from '../astHelper';

export const complexityRule: Rule = {
  id: 'complexity',
  name: 'Cyclomatic Complexity Heuristics',
  description: 'Measures structural complexity by tracking loops, switches, conditionals, and logical operators.',
  
  analyze(code: string, _lines: string[]): Issue[] {
    const issues: Issue[] = [];
    const ast = parseAST(code);
    let complexity = 1;
    let mainConstructs: { type: string; line: number }[] = [];

    if (ast) {
      walkAST(ast, (node) => {
        let isBranch = false;
        switch (node.type) {
          case 'IfStatement':
          case 'ConditionalExpression':
          case 'ForStatement':
          case 'ForInStatement':
          case 'ForOfStatement':
          case 'WhileStatement':
          case 'DoWhileStatement':
            isBranch = true;
            break;
          case 'SwitchCase':
            if (node.test) isBranch = true; // Avoid counting default case
            break;
          case 'LogicalExpression':
            if (node.operator === '&&' || node.operator === '||') isBranch = true;
            break;
        }

        if (isBranch) {
          complexity++;
          const line = node.loc?.start.line;
          if (line) {
            mainConstructs.push({ type: node.type, line });
          }
        }
      });
    } else {
      // Regex fallback
      const matches = code.match(/\b(if|for|while|case)\b|\?|&&|\|\|/g);
      complexity += matches ? matches.length : 0;
    }

    if (complexity > 12) {
      issues.push({
        id: `complexity-critical-${Date.now()}`,
        ruleId: 'complexity',
        severity: 'critical',
        line: mainConstructs[0]?.line || 1,
        message: `High Cyclomatic Complexity (Score: ${complexity})`,
        explanation: `The cyclomatic complexity score is ${complexity}, exceeding the standard maximum limit of 12. Nested branches and compound conditions make this code difficult to test, verify, and maintain.`,
        suggestion: 'Refactor by extracting nested branches into separate, well-named helper functions or using guard clauses to return early.'
      });
    } else if (complexity > 8) {
      issues.push({
        id: `complexity-warning-${Date.now()}`,
        ruleId: 'complexity',
        severity: 'warning',
        line: mainConstructs[0]?.line || 1,
        message: `Moderate Cyclomatic Complexity (Score: ${complexity})`,
        explanation: `The cyclomatic complexity score is ${complexity}. The logic has a high density of decision points, increasing cognitive load and bug potential.`,
        suggestion: 'Consider minor cleanup: flatten nested conditionals or simplify logical conditions.'
      });
    }

    return issues;
  },

  getThinkingStep(code: string): ThinkingStep {
    const ast = parseAST(code);
    let complexity = 1;

    if (ast) {
      walkAST(ast, (node) => {
        switch (node.type) {
          case 'IfStatement':
          case 'ConditionalExpression':
          case 'ForStatement':
          case 'ForInStatement':
          case 'ForOfStatement':
          case 'WhileStatement':
          case 'DoWhileStatement':
            complexity++;
            break;
          case 'SwitchCase':
            if (node.test) complexity++;
            break;
          case 'LogicalExpression':
            if (node.operator === '&&' || node.operator === '||') complexity++;
            break;
        }
      });
    } else {
      const matches = code.match(/\b(if|for|while|case)\b|\?|&&|\|\|/g);
      complexity += matches ? matches.length : 0;
    }

    let observation = `Calculated cyclomatic complexity: ${complexity}. `;
    let conclusion = '';

    if (complexity > 12) {
      observation += `Found excessive control structures and conditional branching statements.`;
      conclusion = `Complexity exceeds the safety threshold of 12 (Score: ${complexity}). Strongly recommend modularization.`;
    } else if (complexity > 8) {
      observation += `Identified moderate nesting and branching patterns.`;
      conclusion = `Complexity is moderate (Score: ${complexity}). Code is acceptable but could benefit from structured simplification.`;
    } else {
      observation += `Branching pathways and loop scopes are well-contained.`;
      conclusion = `Complexity is low (Score: ${complexity}). Excellent readability and easy unit-test coverage.`;
    }

    return {
      phase: 'Structural Complexity Audit',
      observation,
      conclusion
    };
  }
};
