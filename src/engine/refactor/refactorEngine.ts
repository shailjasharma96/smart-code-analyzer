import { Issue } from '../types';

export const refactorEngine = {
  /**
   * Applies safe, line-targeted transformations based on detected issues.
   * Walks issues in descending line order to preserve index mapping.
   */
  apply(code: string, issues: Issue[]): string {
    const lines = code.split('\n');
    
    // Sort issues by line number descending to safely make line additions/removals if needed
    const sortedIssues = [...issues].sort((a, b) => (b.line || 0) - (a.line || 0));

    const stubs: string[] = [];
    const definedStubs = new Set<string>();

    sortedIssues.forEach(issue => {
      if (!issue.line) return;
      const lineIndex = issue.line - 1;
      let lineText = lines[lineIndex];
      if (lineText === undefined) return;

      switch (issue.ruleId) {
        case 'scope':
          // Auto-declare missing function stubs
          if (issue.message.includes('Undefined Function Invocation')) {
            const funcMatch = issue.message.match(/'([^']+)'/);
            if (funcMatch) {
              const funcName = funcMatch[1];
              if (!definedStubs.has(funcName)) {
                definedStubs.add(funcName);
                stubs.push(`\n// Auto-stub for undefined function '${funcName}' to prevent ReferenceError\nfunction ${funcName}() {\n  console.warn("${funcName} invoked but not implemented.");\n  return null;\n}`);
              }
            }
          }
          // Auto-declare missing variable stubs
          else if (issue.message.includes('Undefined Variable Reference')) {
            const varMatch = issue.message.match(/'([^']+)'/);
            if (varMatch) {
              const varName = varMatch[1];
              if (!definedStubs.has(varName)) {
                definedStubs.add(varName);
                stubs.push(`\n// Auto-stub for undefined variable '${varName}' to prevent ReferenceError\nconst ${varName} = null;`);
              }
            }
          }
          break;

        case 'naming':
          // Convert naming conventions to correct camelCase or PascalCase structures
          if (issue.message.includes('Casing') || issue.message.includes('snake_case') || issue.message.includes('Casing Mismatch')) {
            // Convert snake_case identifiers to camelCase
            const snakeMatch = lineText.match(/\b([a-z0-9]+)_([a-z0-9_]+)\b/);
            if (snakeMatch) {
              const fullSnake = snakeMatch[0];
              const camel = fullSnake.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
              lineText = lineText.replace(new RegExp(`\\b${fullSnake}\\b`, 'g'), camel);
            }
            
            // Convert class lowercase names to PascalCase
            const classMatch = lineText.match(/\bclass\s+([a-z][a-zA-Z0-9]*)\b/);
            if (classMatch) {
              const lowerClass = classMatch[1];
              const pascalClass = lowerClass.charAt(0).toUpperCase() + lowerClass.slice(1);
              lineText = lineText.replace(lowerClass, pascalClass);
            }
          }
          break;

        case 'performance':
          // Resolve synchronous I/O blocks safely
          if (issue.message.includes('Synchronous Blocking Call')) {
            lineText = lineText
              .replace(/\breadFileSync\b/g, 'promises.readFile')
              .replace(/\bwriteFileSync\b/g, 'promises.writeFile');
            // Safely prepend await inside statement if needed
            if (!lineText.includes('await ')) {
              lineText = lineText.replace(/(\b\w+\.promises\.\w+)/, 'await $1');
            }
          }
          break;

        case 'security':
          // Safe eval disablements
          if (issue.message.includes('eval()')) {
            const indent = lineText.match(/^\s*/)?.[0] || '';
            lineText = `${indent}// Refactored: disabled unsafe eval invocation\n${indent}// ${lineText.trim()}\n${indent}console.warn("Unsafe eval execution was blocked.");`;
          }
          // Move hardcoded secret keys to process.env defaults
          else if (issue.message.includes('Hardcoded Sensitive Secret')) {
            const secretMatch = lineText.match(/(const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(["'`])([^"']+)\3/);
            if (secretMatch) {
              const varName = secretMatch[2];
              const envName = varName.replace(/([A-Z])/g, '_$1').toUpperCase();
              lineText = lineText.replace(secretMatch[0], `${secretMatch[1]} ${varName} = process.env.${envName} || "[REDACTED_MOCK_ENV_KEY]"`);
            }
          }
          // Convert SQL injections to parameterized queries
          else if (issue.message.includes('SQL Injection')) {
            if (lineText.includes('+')) {
              const queryMatch = lineText.match(/(db\.query|database\.query|query)\s*\((["'`])(.*)\2\s*\+\s*([a-zA-Z0-9_$]+)\s*\)/);
              if (queryMatch) {
                const queryFunc = queryMatch[1];
                const originalQuery = queryMatch[3];
                const paramVar = queryMatch[4];
                const cleanQuery = originalQuery.replace(/\s*=\s*['"]?$/, ' = ?');
                lineText = lineText.replace(queryMatch[0], `${queryFunc}("${cleanQuery}", [${paramVar}])`);
              }
            }
          }
          break;

        case 'errorHandling':
          // Wrap unprotected await statements inside standard try/catch structures
          if (issue.message.includes('Await Expression Outside Try/Catch')) {
            const indent = lineText.match(/^\s*/)?.[0] || '';
            lineText = `${indent}try {\n  ${lineText.trim()}\n${indent}} catch (err) {\n${indent}  console.error("Await failure handle:", err);\n${indent}}`;
          }
          // Fill empty catch blocks
          else if (issue.message.includes('Empty Catch Block')) {
            if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(lineText)) {
              const catchVarMatch = lineText.match(/catch\s*\(([^)]*)\)/);
              const catchVar = catchVarMatch?.[1] || 'error';
              lineText = lineText.replace(/\{\s*\}/, `{\n      console.error(${catchVar});\n    }`);
            } else if (/catch\s*\(([^)]*)\)\s*\{/.test(lineText)) {
              const catchVarMatch = lineText.match(/catch\s*\(([^)]*)\)/);
              const catchVar = catchVarMatch?.[1] || 'error';
              lineText = lineText.replace(/\{/, `{\n      console.error(${catchVar});`);
            }
          }
          break;

        case 'bestPractice':
          // Upgrade var -> const
          if (issue.message.includes("var' Keyword")) {
            lineText = lineText.replace(/\bvar\s+/, 'const ');
          }
          // Upgrade == -> === and != -> !==
          else if (issue.message.includes('Loose Equality')) {
            lineText = lineText
              .replace(/\b==\b/g, '===')
              .replace(/\b!=\b/g, '!==');
            lineText = lineText
              .replace(/====/g, '===')
              .replace(/!===/g, '!==');
          }
          // Remove leftover debug console logs
          else if (issue.message.includes('console.log')) {
            const indent = lineText.match(/^\s*/)?.[0] || '';
            lineText = `${indent}// Refactored: removed leftover debug statement\n${indent}// ${lineText.trim()}`;
          }
          break;

        case 'nodeSpecific':
          // process.env fallback logic
          if (issue.message.includes('process.env')) {
            const match = lineText.match(/process\.env\.([a-zA-Z0-9_$]+)/);
            if (match) {
              const envVar = match[0];
              const varName = match[1];
              let fallbackVal = "'development'";
              if (varName.includes('PORT')) fallbackVal = '3000';
              else if (varName.includes('LIMIT') || varName.includes('COUNT')) fallbackVal = '10';
              else if (varName.includes('ENABLED') || varName.includes('FLAG')) fallbackVal = 'true';

              if (!lineText.includes('||') && !lineText.includes('??')) {
                lineText = lineText.replace(envVar, `${envVar} || ${fallbackVal}`);
              }
            }
          }
          break;
      }

      lines[lineIndex] = lineText;
    });

    // Merge stubs at the end of the file
    let refactoredCode = lines.join('\n');
    if (stubs.length > 0) {
      refactoredCode += '\n' + stubs.join('\n');
    }

    return refactoredCode;
  }
};
