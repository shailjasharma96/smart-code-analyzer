import { Rule, Issue, ThinkingStep } from '../types';
import { parseAST, walkAST } from '../astHelper';

export const performanceRule: Rule = {
  id: 'performance',
  name: 'Performance & Thread Blocking',
  description: 'Detects synchronous I/O blocking calls, O(N²) nested loops, and expensive search methods inside iteration blocks.',

  analyze(code: string, _lines: string[]): Issue[] {
    const issues: Issue[] = [];
    const ast = parseAST(code);

    if (ast) {
      walkAST(ast, (node) => {
        const line = node.loc?.start.line || 1;

        // 1. Sync blocking calls
        if (node.type === 'CallExpression') {
          let methodName = '';
          if (node.callee.type === 'Identifier') {
            methodName = node.callee.name;
          } else if (node.callee.type === 'MemberExpression') {
            if (node.callee.property.type === 'Identifier') {
              methodName = node.callee.property.name;
            }
          }

          if (methodName && (methodName.endsWith('Sync') || methodName === 'execSync')) {
            issues.push({
              id: `perf-sync-${Date.now()}-${line}`,
              ruleId: 'performance',
              severity: 'critical',
              line,
              message: `Synchronous Blocking Call ('${methodName}')`,
              explanation: `JavaScript and Node.js are single-threaded. Calling synchronous methods like '${methodName}' blocks the event loop entirely. This means no other requests can be handled and the UI/server freezes until the action completes.`,
              suggestion: `Replace '${methodName}' with its asynchronous, Promise-based equivalent (e.g. fs.promises.readFile instead of fs.readFileSync).`
            });
          }
        }

        // Helper to check if a node is a loop
        const isLoop = (n: any) =>
          n && (n.type === 'ForStatement' || n.type === 'ForInStatement' || n.type === 'ForOfStatement' || n.type === 'WhileStatement' || n.type === 'DoWhileStatement');

        // 2. Nested Loops
        if (isLoop(node)) {
          let hasNested = false;
          let nestedLine = line;

          walkAST(node.body, (child) => {
            if (child !== node && isLoop(child) && !hasNested) {
              hasNested = true;
              nestedLine = child.loc?.start.line || line;
            }
          });

          if (hasNested) {
            issues.push({
              id: `perf-nested-loop-${Date.now()}-${line}`,
              ruleId: 'performance',
              severity: 'warning',
              line: nestedLine,
              message: 'Nested Loop Detected (O(N²))',
              explanation: 'Nesting loops inside loops leads to quadratic time complexity. If the outer array has N elements and the inner array has M elements, the operation executes N * M times. For large datasets, this will lock up the thread.',
              suggestion: 'Consider optimizing by mapping one of the datasets into a Map or Set to perform O(1) lookups instead of scanning in an inner loop.'
            });
          }

          // 3. Repeated search methods inside loops
          walkAST(node.body, (child) => {
            if (child.type === 'CallExpression' && child.callee.type === 'MemberExpression') {
              const prop = child.callee.property;
              if (prop.type === 'Identifier' && ['indexOf', 'includes', 'find', 'filter', 'some', 'every'].includes(prop.name)) {
                issues.push({
                  id: `perf-loop-search-${Date.now()}-${child.loc?.start.line || line}`,
                  ruleId: 'performance',
                  severity: 'warning',
                  line: child.loc?.start.line || line,
                  message: `Linear Search ('${prop.name}') Inside Loop`,
                  explanation: `Calling '${prop.name}' inside a loop effectively creates a hidden nested loop, resulting in O(N²) time complexity. This is because '${prop.name}' scans the array item-by-item on every single outer iteration.`,
                  suggestion: `Pre-compute the search collection. Convert the target array into a Set or Map outside the loop and perform O(1) lookups (.has() or .get()) inside the loop.`
                });
              }
            }
          });
        }
      });
    } else {
      // Regex fallback
      if (/\b(?:readFileSync|writeFileSync|execSync)\b/.test(code)) {
        issues.push({
          id: `perf-sync-rx-${Date.now()}`,
          ruleId: 'performance',
          severity: 'critical',
          message: 'Synchronous I/O Blocking API call detected',
          explanation: 'Standard sync Node.js file operations block the single main execution thread.',
          suggestion: 'Switch to fs.promises async equivalents.'
        });
      }
      // Simple nested loop check
      if (/\bfor\s*\([^)]*\)\s*\{[^{}]*\bfor\s*\([^)]*\)/.test(code)) {
        issues.push({
          id: `perf-nested-rx-${Date.now()}`,
          ruleId: 'performance',
          severity: 'warning',
          message: 'Potential Nested Loop Structure',
          explanation: 'A nested loop was detected, which could trigger quadratic execution costs.',
          suggestion: 'Review loop counts and convert to Map lookups if possible.'
        });
      }
    }

    return issues;
  },

  getThinkingStep(code: string): ThinkingStep {
    const issues = this.analyze(code, []);
    const syncCalls = issues.filter(i => i.message.includes('Synchronous'));
    const nestedLoops = issues.filter(i => i.message.includes('Nested Loop'));
    const loopSearches = issues.filter(i => i.message.includes('Linear Search'));

    let observation = 'Inspected thread performance, synchronous Node interfaces, and nesting loop indices. ';
    let conclusion = '';

    if (syncCalls.length > 0) {
      observation += `Found ${syncCalls.length} blocking synchronous operations (e.g. readFileSync).`;
      conclusion = `Critical runtime risk: Synchronous operations block Node's single-threaded event loop, leading to server timeouts. Use async-promise wrappers.`;
    } else if (nestedLoops.length > 0 || loopSearches.length > 0) {
      observation += `Found ${nestedLoops.length} O(N²) nested loops and ${loopSearches.length} linear array searches inside iterations.`;
      conclusion = `Performance bottleneck detected. Scale factor will trigger high CPU locks. Recommend swapping loops for O(1) Hash Map references.`;
    } else {
      observation += `All loops are flat and lookups are optimized. No synchronous blocking operations detected.`;
      conclusion = `Excellent performance posture. CPU utilization and loop time complexity are fully optimized.`;
    }

    return {
      phase: 'Performance & Event Loop Audit',
      observation,
      conclusion
    };
  }
};
