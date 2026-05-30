import { Rule, Issue, ThinkingStep } from '../types';
import { parseAST, walkAST } from '../astHelper';

export const errorHandlingRule: Rule = {
  id: 'errorHandling',
  name: 'Error Handling & Robustness',
  description: 'Audits try/catch wrapping around await operations, detects empty catch clauses, and flags unhandled promise chains.',

  analyze(code: string, _lines: string[]): Issue[] {
    const issues: Issue[] = [];
    const ast = parseAST(code);

    if (ast) {
      // Keep track of active try/catch contexts as we walk.
      // But since walkAST does a simple walk, we can instead do a stack-based traversal, 
      // or we can write a helper to check if a node has a TryStatement ancestor.
      // Let's implement an ancestor checker.
      const hasTryAncestor = (targetNode: any): boolean => {
        let found = false;
        // Since we don't have parents, we can run a custom top-down search that tracks if we are inside a try block
        // Let's write a simple recursive function that searches the AST and tracks activeTry depth
        const checkNode = (node: any, inTry: boolean) => {
          if (!node || found) return;
          
          let nextInTry = inTry;
          if (node.type === 'TryStatement') {
            nextInTry = true;
          }
          
          // If we found our AwaitExpression and we're not in a TryStatement, mark it!
          if (node === targetNode) {
            if (inTry) {
              found = true;
            }
            return;
          }
          
          // Recurse down children, reset try context if we cross function boundaries!
          const isFunction = (n: any) => 
            n && (n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression');
          
          for (const key in node) {
            if (Object.prototype.hasOwnProperty.call(node, key)) {
              const val = node[key];
              if (Array.isArray(val)) {
                val.forEach(child => checkNode(child, isFunction(child) ? false : nextInTry));
              } else if (val && typeof val === 'object' && typeof val.type === 'string') {
                checkNode(val, isFunction(val) ? false : nextInTry);
              }
            }
          }
        };
        
        checkNode(ast, false);
        return found;
      };

      walkAST(ast, (node) => {
        const line = node.loc?.start.line || 1;

        // 1. Check Await Expressions not wrapped in Try
        if (node.type === 'AwaitExpression') {
          const isProtected = hasTryAncestor(node);
          if (!isProtected) {
            issues.push({
              id: `error-await-${Date.now()}-${line}`,
              ruleId: 'errorHandling',
              severity: 'warning',
              line,
              message: 'Await Expression Outside Try/Catch',
              explanation: 'This await statement is not protected by a try/catch block. If the awaited Promise rejects, it will cause an unhandled promise rejection, which can crash Node.js or leave your application in a broken state.',
              suggestion: 'Wrap the await expression in a try/catch block to handle potential operational errors gracefully.'
            });
          }
        }

        // 2. Check Empty Catch Clauses
        if (node.type === 'CatchClause') {
          if (!node.body || !node.body.body || node.body.body.length === 0) {
            issues.push({
              id: `error-empty-catch-${Date.now()}-${line}`,
              ruleId: 'errorHandling',
              severity: 'critical',
              line,
              message: 'Empty Catch Block (Silent Failure)',
              explanation: 'An empty catch block swallows errors silently. This makes debugging exceptionally difficult because failures occur without any logging, tracing, or reporting.',
              suggestion: 'Add error handling inside the catch block. At a minimum, log the error (e.g. console.error(error)) or rethrow/propagate it.'
            });
          } else {
            // Check if it only logs the error
            const bodyStatements = node.body.body;
            const onlyLogs = bodyStatements.every((stmt: any) => {
              return stmt.type === 'ExpressionStatement' && 
                     stmt.expression.type === 'CallExpression' && 
                     stmt.expression.callee.type === 'MemberExpression' &&
                     stmt.expression.callee.object.name === 'console';
            });
            if (onlyLogs) {
              issues.push({
                id: `error-log-only-${Date.now()}-${line}`,
                ruleId: 'errorHandling',
                severity: 'info',
                line,
                message: 'Basic console logging in Catch Block',
                explanation: 'The error is only logged to console.log/console.error. While better than nothing, this does not recover from the failure or bubble it up to a central error handling middleware.',
                suggestion: 'Consider adding telemetry logging, recovering with fallback values, or re-throwing a custom error.'
              });
            }
          }
        }
      });
    } else {
      // Regex fallback
      // Await check
      const awaitCount = (code.match(/\bawait\b/g) || []).length;
      const tryCount = (code.match(/\btry\b/g) || []).length;
      if (awaitCount > 0 && tryCount === 0) {
        issues.push({
          id: `error-await-rx-${Date.now()}`,
          ruleId: 'errorHandling',
          severity: 'warning',
          message: 'Potential Unprotected Await Statement',
          explanation: 'Found await keywords but no try/catch structures. Code is vulnerable to unhandled promise rejections.',
          suggestion: 'Introduce try/catch wrappers around async/await calls.'
        });
      }

      // Empty catch check
      if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(code)) {
        issues.push({
          id: `error-catch-rx-${Date.now()}`,
          ruleId: 'errorHandling',
          severity: 'critical',
          message: 'Silent Catch Block Detected',
          explanation: 'A catch block was found containing no handling statements, silently swallowing errors.',
          suggestion: 'Ensure all caught errors are logged or bubbled.'
        });
      }
    }

    return issues;
  },

  getThinkingStep(code: string): ThinkingStep {
    const issues = this.analyze(code, []);
    const criticals = issues.filter(i => i.severity === 'critical');
    const warnings = issues.filter(i => i.severity === 'warning');

    let observation = 'Auditing try/catch scopes, catch block bodies, and asynchronous awaits. ';
    let conclusion = '';

    if (criticals.length > 0) {
      observation += `Detected ${criticals.length} empty catch blocks that swallow errors silently.`;
      conclusion = `Critical threat: Silent failures will block system diagnostic efforts. Immediate resolution required.`;
    } else if (warnings.length > 0) {
      observation += `Found unprotected await expressions that run risk of unhandled rejections.`;
      conclusion = `Error handling is present but partial. Wrap all asynchronous await expressions in robust try/catch blocks.`;
    } else {
      observation += `All awaited actions and try/catch bodies handle errors with active logging or rethrowing.`;
      conclusion = `Excellent robustness score. Errors are cleanly trapped and reported.`;
    }

    return {
      phase: 'Error Handling Validation',
      observation,
      conclusion
    };
  }
};
