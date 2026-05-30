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

    sortedIssues.forEach(issue => {
      if (!issue.line) return;
      const lineIndex = issue.line - 1;
      let lineText = lines[lineIndex];
      if (lineText === undefined) return;

      switch (issue.ruleId) {
        case 'bestPractice':
          // 1. Upgrade var -> const
          if (issue.message.includes("var' Keyword")) {
            // Replace first occurrence of 'var ' with 'const ' on this line
            lineText = lineText.replace(/\bvar\s+/, 'const ');
          }
          // 2. Upgrade == -> === and != -> !==
          else if (issue.message.includes('Loose Equality')) {
            // Perform safe replacements on comparison operators
            lineText = lineText
              .replace(/\b==\b/g, '===')
              .replace(/\b!=\b/g, '!==');
            // Clean up any double-run artifacts
            lineText = lineText
              .replace(/====/g, '===')
              .replace(/!===/g, '!==');
          }
          // 3. Clean up leftover console.log
          else if (issue.message.includes('console.log')) {
            const indent = lineText.match(/^\s*/)?.[0] || '';
            lineText = `${indent}// Refactored: removed leftover debug statement\n${indent}// ${lineText.trim()}`;
          }
          break;

        case 'errorHandling':
          // 4. Fill empty catch blocks
          if (issue.message.includes('Empty Catch Block')) {
            // Find and enrich catch block structures
            if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(lineText)) {
              // Inline empty block like "catch (err) {}"
              const catchVarMatch = lineText.match(/catch\s*\(([^)]*)\)/);
              const catchVar = catchVarMatch?.[1] || 'error';
              lineText = lineText.replace(/\{\s*\}/, `{\n      console.error(${catchVar});\n    }`);
            } else if (/catch\s*\(([^)]*)\)\s*\{/.test(lineText)) {
              // Block starting on this line
              const catchVarMatch = lineText.match(/catch\s*\(([^)]*)\)/);
              const catchVar = catchVarMatch?.[1] || 'error';
              lineText = lineText.replace(/\{/, `{\n      console.error(${catchVar});`);
            }
          }
          break;

        case 'nodeSpecific':
          // 5. Unsafe environment variable access
          if (issue.message.includes('process.env')) {
            const match = lineText.match(/process\.env\.([a-zA-Z0-9_$]+)/);
            if (match) {
              const envVar = match[0];
              const varName = match[1];
              // Safe fallback depending on typical variable name indicators
              let fallbackVal = "'development'";
              if (varName.includes('PORT')) fallbackVal = '3000';
              else if (varName.includes('LIMIT') || varName.includes('COUNT')) fallbackVal = '10';
              else if (varName.includes('ENABLED') || varName.includes('FLAG')) fallbackVal = 'true';

              // Ensure we aren't adding multiple fallbacks
              if (!lineText.includes('||') && !lineText.includes('??')) {
                lineText = lineText.replace(envVar, `${envVar} || ${fallbackVal}`);
              }
            }
          }
          break;
      }

      lines[lineIndex] = lineText;
    });

    return lines.join('\n');
  }
};
