import { Rule, Issue, ThinkingStep } from '../types';
import { parseAST, walkAST } from '../astHelper';

export const securityRule: Rule = {
  id: 'security',
  name: 'Security & Vulnerability Audit',
  description: 'Audits for eval usage, hardcoded credentials, API key exposure, SQL injection vectors, and command injection.',

  analyze(code: string, _lines: string[]): Issue[] {
    const issues: Issue[] = [];
    const ast = parseAST(code);

    if (ast) {
      walkAST(ast, (node) => {
        const line = node.loc?.start.line || 1;

        // 1. eval() and new Function() check
        if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'eval') {
          issues.push({
            id: `sec-eval-${Date.now()}-${line}`,
            ruleId: 'security',
            severity: 'critical',
            line,
            message: "Dangerous Use of eval()",
            explanation: 'The eval() function evaluates JavaScript code represented as a string. Passing dynamic input to eval() opens a massive Remote Code Execution (RCE) vulnerability, enabling hackers to run arbitrary instructions on the server or browser.',
            suggestion: 'Remove eval() entirely. Use standard object lookups, JSON.parse(), or safe functions instead.'
          });
        }

        if (node.type === 'NewExpression' && node.callee.type === 'Identifier' && node.callee.name === 'Function') {
          issues.push({
            id: `sec-new-func-${Date.now()}-${line}`,
            ruleId: 'security',
            severity: 'critical',
            line,
            message: "Dangerous 'new Function()' constructor",
            explanation: "Constructing functions dynamically via 'new Function()' is equivalent to calling eval() and poses severe security injection hazards.",
            suggestion: "Refactor code to use standard declared functions or closures."
          });
        }

        // 2. Hardcoded secret credentials
        if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') {
          const varName = node.id.name.toLowerCase();
          const isSecretField = varName.includes('password') ||
                                varName.includes('secret') ||
                                varName.includes('apikey') ||
                                varName.includes('token') ||
                                varName.includes('passphrase') ||
                                varName.includes('privatekey');

          if (isSecretField && node.init && node.init.type === 'Literal' && typeof node.init.value === 'string') {
            const secretValue = node.init.value;
            // Ignore very short or empty values which are placeholders
            if (secretValue.length > 4 && !secretValue.includes('placeholder') && !secretValue.includes('YOUR_')) {
              issues.push({
                id: `sec-secret-${Date.now()}-${line}`,
                ruleId: 'security',
                severity: 'critical',
                line,
                message: `Hardcoded Sensitive Secret ('${node.id.name}')`,
                explanation: `A secret, password, or API token is hardcoded into the source code. Storing credentials in plain text leads directly to unauthorized system access and credential leaks when the code is pushed to Git repositories.`,
                suggestion: `Move the secret to environment variables (e.g. process.env.${node.id.name.toUpperCase()}) or use a dedicated secrets manager.`
              });
            }
          }
        }

        // 3. SQL injection patterns in database query interfaces
        if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
          const prop = node.callee.property;
          if (prop.type === 'Identifier' && ['query', 'execute'].includes(prop.name)) {
            const firstArg = node.arguments[0];
            if (firstArg) {
              let isUnsafeString = false;
              // Check if query is constructed by string concatenation (+ operator)
              if (firstArg.type === 'BinaryExpression' && firstArg.operator === '+') {
                isUnsafeString = true;
              }
              // Check if query is constructed via Template Literal interpolation
              else if (firstArg.type === 'TemplateLiteral' && firstArg.expressions && firstArg.expressions.length > 0) {
                // If it's interpolating query variables, flag it!
                isUnsafeString = true;
              }

              if (isUnsafeString) {
                // Check if query looks like SQL
                const codeSnippet = code.slice(node.start, node.end);
                const isSql = /select|insert|update|delete|where/i.test(codeSnippet);
                if (isSql) {
                  issues.push({
                    id: `sec-sql-${Date.now()}-${line}`,
                    ruleId: 'security',
                    severity: 'critical',
                    line,
                    message: "Potential SQL Injection Vulnerability",
                    explanation: "Database query strings are built using variable interpolation or concatenation. This allows malicious actors to manipulate the SQL statement structure (e.g. entering 'OR 1=1'), bypassing authentication and reading/deleting entire databases.",
                    suggestion: "Use parameterized queries or placeholders (e.g., db.query('SELECT * FROM users WHERE id = ?', [userId])) to ensure variables are escaped securely."
                  });
                }
              }
            }
          }
        }

        // 4. OS Command injection vectors
        if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && ['exec', 'execSync'].includes(node.callee.name)) {
          const firstArg = node.arguments[0];
          if (firstArg && (firstArg.type === 'BinaryExpression' || firstArg.type === 'TemplateLiteral')) {
            issues.push({
              id: `sec-cmd-${Date.now()}-${line}`,
              ruleId: 'security',
              severity: 'critical',
              line,
              message: "Potential OS Command Injection",
              explanation: "Arguments passed to shell executions (exec/execSync) utilize string interpolation or concatenation. Dynamic user inputs can hijack the command line using shell metacharacters like ';' or '&&' to execute unauthorized system commands.",
              suggestion: "Avoid executing raw shell commands. Use safer alternatives like execFile or spawn, which pass arguments in a secure array."
            });
          }
        }
      });
    } else {
      // Regex fallback
      if (/\beval\s*\(/.test(code)) {
        issues.push({
          id: `sec-eval-rx-${Date.now()}`,
          ruleId: 'security',
          severity: 'critical',
          message: 'Dangerous eval() invocation',
          explanation: 'Running eval execute inputs directly, allowing injection attacks.',
          suggestion: 'Refactor away from eval.'
        });
      }
      if (/(?:password|secret|apikey|token)\s*=\s*['"][a-zA-Z0-9_$]{8,}['"]/i.test(code)) {
        issues.push({
          id: `sec-secret-rx-${Date.now()}`,
          ruleId: 'security',
          severity: 'critical',
          message: 'Hardcoded Secret Key pattern found',
          explanation: 'Exposing credentials in source code files is highly insecure.',
          suggestion: 'Extract to env variables.'
        });
      }
    }

    return issues;
  },

  getThinkingStep(code: string): ThinkingStep {
    const issues = this.analyze(code, []);
    const evals = issues.filter(i => i.message.includes('eval') || i.message.includes('Function'));
    const secrets = issues.filter(i => i.message.includes('Secret'));
    const injections = issues.filter(i => i.message.includes('SQL') || i.message.includes('Command'));

    let observation = 'Initiating comprehensive security audit for vulnerabilities. ';
    let conclusion = '';

    if (issues.length > 0) {
      observation += `Flagged ${evals.length} remote execution vectors (eval), ${secrets.length} plain-text hardcoded credentials, and ${injections.length} injection pathways (SQL/Command).`;
      conclusion = `Critical vulnerability alert! Source file contains high-impact security risks. Deploying to production is dangerous. Parameterize queries and scrub plain-text secrets immediately.`;
    } else {
      observation += `No uses of eval(), plain-text secret assignments, SQL concatenation, or dynamic OS executions were found.`;
      conclusion = `Excellent security posture. No common injection or leakage vectors observed.`;
    }

    return {
      phase: 'Security Vulnerability Scan',
      observation,
      conclusion
    };
  }
};
