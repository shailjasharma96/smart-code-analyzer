import { Rule, Issue, ThinkingStep } from '../types';
import { parseAST, walkAST } from '../astHelper';

export const namingRule: Rule = {
  id: 'naming',
  name: 'Naming Conventions Audit',
  description: 'Audits variables and functions for snake_case, single-character, and generic naming schemas.',

  analyze(code: string, _lines: string[]): Issue[] {
    const issues: Issue[] = [];
    const ast = parseAST(code);
    const genericNames = ['temp', 'tmp', 'foo', 'bar', 'data', 'obj', 'arr', 'val', 'value'];

    if (ast) {
      walkAST(ast, (node) => {
        let name = '';
        let typeLabel = '';
        let isLoopIndex = false;

        if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') {
          name = node.id.name;
          typeLabel = 'Variable';
          // Check if parent or grandparent is a ForStatement (making it a loop index)
          // Since our walk helper doesn't attach parent, we can check if it is 'i' or 'j' which are standard, 
          // or we can just flag single-char variables generally if they are length 1 and not 'i', 'j', 'k'
          if (name === 'i' || name === 'j' || name === 'k') {
            isLoopIndex = true;
          }
        } else if (node.type === 'FunctionDeclaration' && node.id && node.id.type === 'Identifier') {
          name = node.id.name;
          typeLabel = 'Function';
        } else if (node.type === 'ClassDeclaration' && node.id && node.id.type === 'Identifier') {
          name = node.id.name;
          typeLabel = 'Class';
        }

        if (!name || isLoopIndex) return;

        const line = node.loc?.start.line || 1;

        // 1. Single character names
        if (name.length === 1) {
          issues.push({
            id: `naming-single-${Date.now()}-${name}`,
            ruleId: 'naming',
            severity: 'warning',
            line,
            message: `Single-Character ${typeLabel} Name ('${name}')`,
            explanation: `Using a single-character name '${name}' makes the code hard to read and understand. Meaningful names are essential for long-term maintainability.`,
            suggestion: `Rename '${name}' to a more descriptive name that reflects its purpose (e.g., 'index', 'counter', 'user').`
          });
        }

        // 2. Generic names
        if (genericNames.includes(name.toLowerCase())) {
          issues.push({
            id: `naming-generic-${Date.now()}-${name}`,
            ruleId: 'naming',
            severity: 'info',
            line,
            message: `Generic ${typeLabel} Name ('${name}')`,
            explanation: `The name '${name}' is too generic. It provides no context about what data it holds.`,
            suggestion: `Replace '${name}' with a context-rich name (e.g. instead of 'data', use 'userData' or 'transactionHistory').`
          });
        }

        // 3. Casing checks
        // We expect variables/functions to be camelCase, UPPER_CASE for constants, PascalCase for classes
        const isCamelCase = /^[a-z][a-zA-Z0-9]*$/.test(name);
        const isUpperCase = /^[A-Z][A-Z0-9_]*$/.test(name);
        const isPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(name);

        if (typeLabel === 'Variable') {
          // If it's a variable, it can be camelCase OR UPPER_CASE (constant)
          if (!isCamelCase && !isUpperCase) {
            issues.push({
              id: `naming-case-${Date.now()}-${name}`,
              ruleId: 'naming',
              severity: 'warning',
              line,
              message: `Non-Standard Variable Casing ('${name}')`,
              explanation: `Variable names should be in camelCase (e.g., 'totalAmount') or UPPER_CASE for constants. Snake_case or irregular casing reduces consistency in JavaScript projects.`,
              suggestion: `Convert '${name}' to camelCase (e.g., '${name.replace(/_([a-z])/g, (_, g) => g.toUpperCase())}') or UPPER_CASE.`
            });
          }
        } else if (typeLabel === 'Function') {
          if (!isCamelCase) {
            issues.push({
              id: `naming-case-${Date.now()}-${name}`,
              ruleId: 'naming',
              severity: 'warning',
              line,
              message: `Non-Standard Function Casing ('${name}')`,
              explanation: `Function names should use camelCase (e.g., 'fetchData').`,
              suggestion: `Convert '${name}' to camelCase.`
            });
          }
        } else if (typeLabel === 'Class') {
          if (!isPascalCase) {
            issues.push({
              id: `naming-case-${Date.now()}-${name}`,
              ruleId: 'naming',
              severity: 'warning',
              line,
              message: `Non-Standard Class Casing ('${name}')`,
              explanation: `Class names should use PascalCase (e.g., 'UserProfileManager').`,
              suggestion: `Convert '${name}' to PascalCase (e.g. starting with an uppercase letter).`
            });
          }
        }
      });
    } else {
      // Regex fallback
      const declMatches = code.matchAll(/\b(?:var|let|const|function|class)\s+([a-zA-Z0-9_$]+)/g);
      for (const match of declMatches) {
        const name = match[1];
        if (name.length === 1 && !['i', 'j', 'k'].includes(name)) {
          issues.push({
            id: `naming-single-rx-${Date.now()}-${name}`,
            ruleId: 'naming',
            severity: 'warning',
            message: `Single-Character Identifier ('${name}')`,
            explanation: `Identifier '${name}' is a single character, which impairs readability.`,
            suggestion: `Use a more meaningful term.`
          });
        }
        if (genericNames.includes(name.toLowerCase())) {
          issues.push({
            id: `naming-generic-rx-${Date.now()}-${name}`,
            ruleId: 'naming',
            severity: 'info',
            message: `Generic Identifier ('${name}')`,
            explanation: `Identifier '${name}' is too generic.`,
            suggestion: `Replace with a context-rich name.`
          });
        }
        // Snake case warning
        if (name.includes('_') && name !== name.toUpperCase()) {
          issues.push({
            id: `naming-case-rx-${Date.now()}-${name}`,
            ruleId: 'naming',
            severity: 'warning',
            message: `Non-Standard Casing ('${name}')`,
            explanation: `Variable/function '${name}' uses snake_case or irregular naming. Use camelCase.`,
            suggestion: `Convert '${name}' to camelCase.`
          });
        }
      }
    }

    return issues;
  },

  getThinkingStep(code: string): ThinkingStep {
    const issues = this.analyze(code, []);
    const singleChar = issues.filter(i => i.message.includes('Single-Character'));
    const generic = issues.filter(i => i.message.includes('Generic'));
    const casing = issues.filter(i => i.message.includes('Casing'));

    let observation = `Audited variables, constants, functions, and classes. `;
    let conclusion = '';

    if (issues.length > 0) {
      observation += `Found ${singleChar.length} single-letter variables, ${generic.length} generic names, and ${casing.length} naming casing violations.`;
      conclusion = `Naming consistency is compromised. Flagged ${issues.length} readability issues. Advise transitioning to camelCase and meaningful identifiers.`;
    } else {
      observation += `All checked names strictly follow standard camelCase/UPPER_CASE/PascalCase conventions with rich semantics.`;
      conclusion = `Naming conventions are exemplary. High readability scores achieved.`;
    }

    return {
      phase: 'Naming Convention Audit',
      observation,
      conclusion
    };
  }
};
