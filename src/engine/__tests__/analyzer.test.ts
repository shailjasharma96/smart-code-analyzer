import { describe, it, expect } from 'vitest';
import { analyzeCode } from '../analyzer';
import { calculateScore } from '../scoring';
import { Issue } from '../types';

describe('Smart Code Analyzer - Rules & Engine Tests', () => {

  describe('1. Individual Rule Static Analysis Heuristics', () => {
    
    it('should detect loose comparisons and var keywords (Best Practices)', () => {
      const code = `
        var x = 10;
        if (x == '10') {
          console.log("Stray debug log");
        }
      `;
      const result = analyzeCode(code);
      
      // Should find var warning, loose equality warning, console.log info
      const issues = result.issues;
      expect(issues.some(i => i.message.includes("var' Keyword"))).toBe(true);
      expect(issues.some(i => i.message.includes("Loose Equality"))).toBe(true);
      expect(issues.some(i => i.message.includes("console.log()"))).toBe(true);
    });

    it('should audit variable and function naming conventions (Naming Conventions)', () => {
      const code = `
        const a = 'single-character';
        const my_snake_case_variable = 20;
        const temp = 'generic-placeholder';
        class myClass {}
      `;
      const result = analyzeCode(code);
      const issues = result.issues;

      expect(issues.some(i => i.message.includes('Single-Character'))).toBe(true);
      expect(issues.some(i => i.message.includes('Casing'))).toBe(true);
      expect(issues.some(i => i.message.includes('Generic'))).toBe(true);
    });

    it('should detect cyclomatic complexity spikes (Structural Complexity)', () => {
      // 13 conditional decision points (Complexity: 14)
      const code = `
        function checkLevels(a, b, c, d, e) {
          if (a) {
            if (b) {
              if (c) {
                return d ? e : a;
              }
            }
          }
          if (d && e || a || b) {
            switch (c) {
              case 1: 
                if (e) {
                  return 'one'; 
                } else {
                  return 'one-alt';
                }
              case 2: return 'two';
              case 3: return 'three';
            }
          }
          return null;
        }
      `;
      const result = analyzeCode(code);
      expect(result.issues.some(i => i.message.includes('High Cyclomatic Complexity'))).toBe(true);
    });

    it('should audit security vulnerabilities: eval, secrets, and injection (Security)', () => {
      const code = `
        const apiKey = "AIzaSyD-rQ4fH8Xj5w8e9u0aBcDeFgHiJkLmNoP";
        const role = 'user';
        eval("if (role === 'admin') { doSomething(); }");
        db.query("SELECT * FROM users WHERE username = '" + username + "'");
      `;
      const result = analyzeCode(code);
      const issues = result.issues;

      expect(issues.some(i => i.message.includes('eval()'))).toBe(true);
      expect(issues.some(i => i.message.includes('Hardcoded Sensitive Secret'))).toBe(true);
      expect(issues.some(i => i.message.includes('SQL Injection'))).toBe(true);
    });

    it('should audit unhandled promise rejections and empty catches (Error Handling)', () => {
      const code = `
        async function fetchInfo() {
          await db.save(); // unprotected await
          try {
            await db.delete();
          } catch(err) {
            // empty catch - silent failure
          }
        }
      `;
      const result = analyzeCode(code);
      const issues = result.issues;

      expect(issues.some(i => i.message.includes('Await Expression Outside Try/Catch'))).toBe(true);
      expect(issues.some(i => i.message.includes('Empty Catch Block'))).toBe(true);
    });

    it('should audit performance synchronous locks and array lookups (Performance)', () => {
      const code = `
        const fs = require('fs');
        function verify(items) {
          const contents = fs.readFileSync('names.txt', 'utf8'); // blocking sync
          for (let i = 0; i < items.length; i++) {
            for (let j = 0; j < items.length; j++) { // nested loop
              console.log(items[i]);
            }
          }
        }
      `;
      const result = analyzeCode(code);
      const issues = result.issues;

      expect(issues.some(i => i.message.includes('Synchronous Blocking Call'))).toBe(true);
      expect(issues.some(i => i.message.includes('Nested Loop Detected'))).toBe(true);
    });
  });

  describe('2. Scoring Logic Deductions & Capping', () => {
    
    it('should compute base score 100 for clean code with no issues', () => {
      const breakdown = calculateScore([]);
      expect(breakdown.score).toBe(100);
      expect(breakdown.grade).toBe('Excellent');
    });

    it('should apply capped deductions for critical, warning, and info issues', () => {
      const mockIssues: Issue[] = [
        // 4 Critical issues (-15 each = -60, but capped at -45)
        { id: '1', ruleId: 'sec', severity: 'critical', message: '', explanation: '', suggestion: '' },
        { id: '2', ruleId: 'sec', severity: 'critical', message: '', explanation: '', suggestion: '' },
        { id: '3', ruleId: 'sec', severity: 'critical', message: '', explanation: '', suggestion: '' },
        { id: '4', ruleId: 'sec', severity: 'critical', message: '', explanation: '', suggestion: '' },
        
        // 6 Warning issues (-5 each = -30, but capped at -25)
        { id: '5', ruleId: 'name', severity: 'warning', message: '', explanation: '', suggestion: '' },
        { id: '6', ruleId: 'name', severity: 'warning', message: '', explanation: '', suggestion: '' },
        { id: '7', ruleId: 'name', severity: 'warning', message: '', explanation: '', suggestion: '' },
        { id: '8', ruleId: 'name', severity: 'warning', message: '', explanation: '', suggestion: '' },
        { id: '9', ruleId: 'name', severity: 'warning', message: '', explanation: '', suggestion: '' },
        { id: '10', ruleId: 'name', severity: 'warning', message: '', explanation: '', suggestion: '' },
        
        // 12 Info issues (-1 each = -12, but capped at -10)
        { id: '11', ruleId: 'best', severity: 'info', message: '', explanation: '', suggestion: '' },
        { id: '12', ruleId: 'best', severity: 'info', message: '', explanation: '', suggestion: '' },
        { id: '13', ruleId: 'best', severity: 'info', message: '', explanation: '', suggestion: '' },
      ];

      const breakdown = calculateScore(mockIssues);
      
      // Expected deductions:
      // Critical: max 45 points deducted
      // Warning: max 25 points deducted
      // Info: 3 points deducted (under cap)
      // Total deduction: 45 + 25 + 3 = 73
      // Score: 100 - 73 = 27
      expect(breakdown.score).toBe(27);
      expect(breakdown.grade).toBe('Poor');
    });
  });

  describe('3. Engine Orchestrator Error Resilience', () => {
    
    it('should catch fatal syntax errors and abort rules traversal', () => {
      const brokenCode = `
        const myValue = { // missing closing bracket
      `;
      const result = analyzeCode(brokenCode);
      
      expect(result.score).toBe(85);
      expect(result.issues.length).toBe(1);
      expect(result.issues[0].message.includes('Fatal Compilation / Syntax Error')).toBe(true);
      expect(result.thinkingTrace[0].conclusion.includes('Fatal parsing bottleneck')).toBe(true);
    });
  });

});
