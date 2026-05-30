import { Rule, Issue, ThinkingStep } from '../types';
import { parseAST, walkAST } from '../astHelper';

export const asyncRule: Rule = {
  id: 'async',
  name: 'Asynchronous Programming Audit',
  description: 'Audits async code structures for nested callbacks (callback hell) and advocates for modern async/await patterns.',

  analyze(code: string, _lines: string[]): Issue[] {
    const issues: Issue[] = [];
    const ast = parseAST(code);
    let maxNesting = 0;
    let callbackHellLine = 0;

    if (ast) {
      // We want to detect nested callback functions.
      // We can walk the AST and for each CallExpression, check if its arguments include functions,
      // and recurse down to count how deep they go.
      
      const getCallbackDepth = (node: any, currentDepth: number): number => {
        if (!node) return currentDepth;
        let maxSubDepth = currentDepth;

        // Helper to check if a node is a callback function
        const isCallback = (arg: any) => 
          arg && (arg.type === 'FunctionExpression' || arg.type === 'ArrowFunctionExpression');

        if (node.type === 'CallExpression') {
          const callbacks = node.arguments.filter(isCallback);
          if (callbacks.length > 0) {
            // We have callback functions here!
            const newDepth = currentDepth + 1;
            if (newDepth > maxNesting) {
              maxNesting = newDepth;
              callbackHellLine = node.loc?.start.line || 1;
            }
            
            // Recurse into the bodies of these callback functions to find nested calls
            callbacks.forEach((cb: any) => {
              walkAST(cb.body, (child) => {
                if (child.type === 'CallExpression') {
                  const depth = getCallbackDepth(child, newDepth);
                  if (depth > maxSubDepth) {
                    maxSubDepth = depth;
                  }
                }
              });
            });
          }
        }
        return maxSubDepth;
      };

      walkAST(ast, (node) => {
        if (node.type === 'CallExpression') {
          getCallbackDepth(node, 0);
        }
      });
    } else {
      // Regex fallback: count nested closures/callbacks by matching indentation or nesting patterns
      // We look for patterns like: function() { ... function() { ... function() {
      const nestedRegex = /(\bfunction\s*\(|=>\s*\{)[^}]*(\bfunction\s*\(|=>\s*\{)[^}]*(\bfunction\s*\(|=>\s*\{)/g;
      if (nestedRegex.test(code)) {
        maxNesting = 3;
        callbackHellLine = 1;
      }
    }

    if (maxNesting >= 3) {
      issues.push({
        id: `async-hell-${Date.now()}`,
        ruleId: 'async',
        severity: 'critical',
        line: callbackHellLine,
        message: `Callback Hell Detected (Nesting Level: ${maxNesting})`,
        explanation: `Found ${maxNesting} levels of nested callbacks. This is known as "Callback Hell" or the "Pyramid of Doom." It makes error propagation extremely fragile and makes code highly difficult to follow.`,
        suggestion: 'Refactor the callbacks to use Promises, or better yet, convert the containing function to an `async` function and `await` the asynchronous operations.'
      });
    } else if (maxNesting === 2) {
      issues.push({
        id: `async-warning-${Date.now()}`,
        ruleId: 'async',
        severity: 'warning',
        line: callbackHellLine,
        message: `Nested Callbacks Detected (Nesting Level: 2)`,
        explanation: `Found nested callback functions. While manageable at 2 levels, nesting callbacks is an outdated pattern that quickly degrades readability.`,
        suggestion: 'Consider refactoring into standard Promise chains (.then()) or async/await syntax.'
      });
    }

    return issues;
  },

  getThinkingStep(code: string): ThinkingStep {
    const issues = this.analyze(code, []);
    const hell = issues.find(i => i.severity === 'critical');
    const warn = issues.find(i => i.severity === 'warning');

    let observation = 'Inspected asynchronous control flow and callback hierarchies. ';
    let conclusion = '';

    if (hell) {
      observation += `Detected deep callback nesting (Level 3+). Indentation patterns signify callback hell.`;
      conclusion = `Critical callback nesting violates clean coding standards. Refactoring to async/await is strongly advised.`;
    } else if (warn) {
      observation += `Found double-nested callbacks in asynchronous calls.`;
      conclusion = `Asynchronous patterns are functional but represent technical debt. Transitioning to Promises is recommended.`;
    } else {
      observation += `No deep callback chains detected. Asynchronous code is clean or follows async/await.`;
      conclusion = `Excellent async/await hygiene. Code control flow is flat and clean.`;
    }

    return {
      phase: 'Asynchronous Programming Scan',
      observation,
      conclusion
    };
  }
};
