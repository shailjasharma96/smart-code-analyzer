import { Rule, Issue, ThinkingStep } from '../types';
import { parseAST, walkAST } from '../astHelper';

export const bestPracticeRule: Rule = {
  id: 'bestPractice',
  name: 'Clean Code & Best Practices',
  description: 'Audits var keyword usage, loose type comparisons (==), and leftover console.log logging blocks.',

  analyze(code: string, _lines: string[]): Issue[] {
    const issues: Issue[] = [];
    const ast = parseAST(code);

    if (ast) {
      walkAST(ast, (node) => {
        const line = node.loc?.start.line || 1;

        // 1. var declarations
        if (node.type === 'VariableDeclaration' && node.kind === 'var') {
          issues.push({
            id: `best-var-${Date.now()}-${line}`,
            ruleId: 'bestPractice',
            severity: 'warning',
            line,
            message: "Usage of 'var' Keyword",
            explanation: "'var' is functionally scope-leaked and hoisted, which frequently causes shadowing bugs and unpredictable values in blocks. ES6 introduced block-scoped 'let' and block-scoped/read-only 'const' to address these design flaws.",
            suggestion: "Replace 'var' declarations with 'let' for reassignable variables, or 'const' for read-only variables."
          });
        }

        // 2. Loose equality comparisons
        if (node.type === 'BinaryExpression' && (node.operator === '==' || node.operator === '!=')) {
          issues.push({
            id: `best-eq-${Date.now()}-${line}`,
            ruleId: 'bestPractice',
            severity: 'warning',
            line,
            message: `Loose Equality Operator ('${node.operator}')`,
            explanation: `Loose comparison ('${node.operator}') performs implicit type coercion, leading to obscure, unexpected comparisons (e.g. false == [] is true).`,
            suggestion: `Replace '${node.operator}' with strict comparison equivalent '${node.operator === '==' ? '===' : '!=='}'.`
          });
        }

        // 3. leftover console.log
        if (node.type === 'CallExpression' && 
            node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'console' &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'log') {
          
          issues.push({
            id: `best-log-${Date.now()}-${line}`,
            ruleId: 'bestPractice',
            severity: 'info',
            line,
            message: "Stray console.log() Statement",
            explanation: "Stray console.log() calls leak diagnostic information to the browser console and pollute production server logs, reducing system performance and log readability.",
            suggestion: "Remove the console.log() or replace it with a dedicated, structured logging library/middleware."
          });
        }
      });
    } else {
      // Regex fallback
      if (/\bvar\s+[a-zA-Z]/.test(code)) {
        issues.push({
          id: `best-var-rx-${Date.now()}`,
          ruleId: 'bestPractice',
          severity: 'warning',
          message: "Outdated 'var' keyword found",
          explanation: "Use let/const instead of hoisting var variables.",
          suggestion: "Update var declarations."
        });
      }
      if (/\b==\b|!=/.test(code)) {
        issues.push({
          id: `best-eq-rx-${Date.now()}`,
          ruleId: 'bestPractice',
          severity: 'warning',
          message: 'Loose Comparison operators detected',
          explanation: 'Loose comparisons are prone to type coercion bugs.',
          suggestion: 'Switch to === or !==.'
        });
      }
    }

    return issues;
  },

  getThinkingStep(code: string): ThinkingStep {
    const issues = this.analyze(code, []);
    const vars = issues.filter(i => i.message.includes('var'));
    const eqs = issues.filter(i => i.message.includes('Loose Equality'));
    const logs = issues.filter(i => i.message.includes('console.log'));

    let observation = 'Checking global scope for ES6 compliance, loose typing coercion, and leftover debug nodes. ';
    let conclusion = '';

    if (issues.length > 0) {
      observation += `Found ${vars.length} var assignments, ${eqs.length} loose comparison checks, and ${logs.length} stray console.logs.`;
      conclusion = `Minor refactoring is suggested. Swapping 'var' for const/let and upgrading '==' to strict '===' will boost type-safety.`;
    } else {
      observation += `No block leakage (var), loose coercion, or console pollution detected.`;
      conclusion = `Excellent best practice hygiene. The code utilizes strict comparisons and block scopes.`;
    }

    return {
      phase: 'Code Cleanliness & Best Practices',
      observation,
      conclusion
    };
  }
};
