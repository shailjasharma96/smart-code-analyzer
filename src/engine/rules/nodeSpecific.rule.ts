import { Rule, Issue, ThinkingStep } from '../types';
import { parseAST, walkAST } from '../astHelper';

export const nodeSpecificRule: Rule = {
  id: 'nodeSpecific',
  name: 'Environment & Module Hygiene',
  description: 'Audits for legacy require() usage instead of ES imports, and verifies environment variable fallbacks.',

  analyze(code: string, _lines: string[]): Issue[] {
    const issues: Issue[] = [];
    const ast = parseAST(code);

    if (ast) {
      walkAST(ast, (node) => {
        const line = node.loc?.start.line || 1;

        // 1. CommonJS require() in modern setups
        if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'require') {
          issues.push({
            id: `node-require-${Date.now()}-${line}`,
            ruleId: 'nodeSpecific',
            severity: 'info',
            line,
            message: "Legacy CommonJS require() Call",
            explanation: "The project uses CommonJS modules ('require') instead of standard ES Module ('import') syntax. ESM is the modern JavaScript standard, supported natively by Node.js and browsers, offering better tree-shaking and static loading benefits.",
            suggestion: "Convert the CommonJS 'require()' to standard ES Module 'import' statement (e.g. import fs from 'fs')."
          });
        }

        // 2. Unsafe process.env variable read (without fallback)
        // Check if node is process.env.SOMETHING
        const isProcessEnv = (n: any) =>
          n && n.type === 'MemberExpression' &&
          n.object.type === 'MemberExpression' &&
          n.object.object && n.object.object.type === 'Identifier' && n.object.object.name === 'process' &&
          n.object.property.type === 'Identifier' && n.object.property.name === 'env';

        if (isProcessEnv(node)) {
          // We need to check if this MemberExpression has a fallback.
          // In AST, we check if this node is part of a LogicalExpression where operator is '||' or '??' and this node is on the left side.
          // Or if it has any parent context representing a fallback.
          // Since our walkAST is top-down, we can search if this node is inside a LogicalExpression that operates as a fallback.
          // Let's check this by checking if the immediate ancestor or parent is a LogicalExpression.
          // To do that, we can search the tree for LogicalExpressions and see if this node is the left child.
          // Let's implement a quick tree check:
          let hasFallback = false;
          
          const checkFallback = (rootNode: any): boolean => {
            let found = false;
            walkAST(rootNode, (parent) => {
              if (parent.type === 'LogicalExpression' && (parent.operator === '||' || parent.operator === '??')) {
                // Check if our node is the left operand of this logical expression
                if (parent.left === node) {
                  found = true;
                }
              }
            });
            return found;
          };

          hasFallback = checkFallback(ast);

          if (!hasFallback) {
            let envVarName = 'VARIABLE';
            if (node.property && node.property.type === 'Identifier') {
              envVarName = node.property.name;
            }

            issues.push({
              id: `node-env-${Date.now()}-${line}`,
              ruleId: 'nodeSpecific',
              severity: 'warning',
              line,
              message: `Unsafe process.env Access ('${envVarName}')`,
              explanation: `Environment variable 'process.env.${envVarName}' is accessed directly without a fallback default value. If this variable is undefined in the deployment environment, it can lead to silent errors, NaN settings, or application crashes.`,
              suggestion: `Provide a safe fallback default value (e.g., const config = process.env.${envVarName} || 'development' or process.env.${envVarName} ?? 'default').`
            });
          }
        }
      });
    } else {
      // Regex fallback
      if (/\brequire\s*\(/.test(code)) {
        issues.push({
          id: `node-require-rx-${Date.now()}`,
          ruleId: 'nodeSpecific',
          severity: 'info',
          message: 'CommonJS require() detected',
          explanation: 'Standard ESM import syntax is preferred in modern environments.',
          suggestion: 'Switch to ESM imports.'
        });
      }
      if (/\bprocess\.env\.[a-zA-Z0-9_$]+\b/.test(code)) {
        // Safe check using simple regex - if no || or ?? follows
        const envMatches = code.matchAll(/\bprocess\.env\.([a-zA-Z0-9_$]+)/g);
        for (const match of envMatches) {
          const index = match.index || 0;
          const surrounding = code.substring(index, index + match[0].length + 10);
          if (!surrounding.includes('||') && !surrounding.includes('??')) {
            issues.push({
              id: `node-env-rx-${Date.now()}-${match[1]}`,
              ruleId: 'nodeSpecific',
              severity: 'warning',
              message: `Unsafe environment variable read ('${match[1]}')`,
              explanation: 'Accessing process.env without fallback defaults.',
              suggestion: 'Provide logical fallbacks.'
            });
          }
        }
      }
    }

    return issues;
  },

  getThinkingStep(code: string): ThinkingStep {
    const issues = this.analyze(code, []);
    const requires = issues.filter(i => i.message.includes('require'));
    const envs = issues.filter(i => i.message.includes('process.env'));

    let observation = 'Inspecting Node environment configurations and modular packaging systems. ';
    let conclusion = '';

    if (issues.length > 0) {
      observation += `Identified ${requires.length} CommonJS modules (require) and ${envs.length} unsafe process.env parameters.`;
      conclusion = `Environmental posture is fragile. Adding defaults to process.env and using ESM import boundaries will enhance portability.`;
    } else {
      observation += `All imports utilize ESM declarations. Environment parameters leverage standard logical defaults.`;
      conclusion = `Excellent Node specific modularity and env configuration integrity.`;
    }

    return {
      phase: 'Node & Module Environment Scan',
      observation,
      conclusion
    };
  }
};
