import { Rule, Issue, ThinkingStep } from '../types';
import { parseAST } from '../astHelper';

// Comprehensive set of standard JavaScript, Node.js, Web Browser built-ins and preloaded demo placeholders
const BUILT_INS = new Set([
  // Core JS globals
  'console', 'JSON', 'Math', 'Promise', 'Date', 'Error', 'Map', 'Set', 'Array', 'Object', 
  'String', 'Number', 'Boolean', 'RegExp', 'Symbol', 'Proxy', 'Reflect', 'WeakMap', 'WeakSet',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'parseInt', 'parseFloat', 
  'encodeURIComponent', 'decodeURIComponent', 'isNaN', 'isFinite', 'eval', 'Error',
  'undefined', 'null', 'NaN', 'Infinity', 'arguments', 'globalThis',
  
  // Typed Arrays
  'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array', 'Int32Array', 
  'Uint32Array', 'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array', 
  'ArrayBuffer', 'SharedArrayBuffer', 'DataView', 'Atomics',
  
  // Browser/Web globals
  'window', 'document', 'navigator', 'fetch', 'alert', 'confirm', 'prompt', 'localStorage', 
  'sessionStorage', 'location', 'history', 'requestAnimationFrame', 'cancelAnimationFrame',
  'performance', 'crypto', 'Headers', 'Request', 'Response', 'URL', 'URLSearchParams', 
  'Event', 'CustomEvent', 'Blob', 'File', 'FormData', 'WebSocket', 'EventSource', 'Worker', 
  'ShadowRoot', 'HTMLElement', 'Element', 'Node', 'MutationObserver', 'IntersectionObserver',
  'Intl', 'AudioContext', 'CanvasRenderingContext2D', 'Audio', 'Image',
  
  // Node.js globals
  'process', 'global', 'require', 'module', 'exports', 'Buffer', '__dirname', '__filename',
  
  // Common testing frameworks (Vitest/Jest)
  'describe', 'it', 'expect', 'test', 'beforeEach', 'afterEach', 'before', 'after', 'jest',
  'vi', 'vitest', 'suite',
  
  // Placeholders in standard preloaded demo snippets
  'db', 'database', 'fs', 'res', 'req', 'next', 'formatOutput', 'getUserPreferences', 'grantAdminRights'
]);

export const scopeRule: Rule = {
  id: 'scope',
  name: 'Lexical Scope & Shadowing Heuristics',
  description: 'Audits block and function scopes to detect variable shadowing, unused variables, and undefined function/variable calls.',

  analyze(code: string, _lines: string[]): Issue[] {
    const issues: Issue[] = [];
    const ast = parseAST(code);
    if (!ast) return [];

    interface VarInfo {
      name: string;
      line: number;
      kind: 'var' | 'let' | 'const' | 'function';
      reassigned: boolean;
      referenced: boolean;
    }

    interface ScopeFrame {
      variables: Map<string, VarInfo>;
      parent: ScopeFrame | null;
    }

    const shadowIssues: { line: number; name: string }[] = [];
    const unusedVars: VarInfo[] = [];
    const immutableLets: VarInfo[] = [];

    // Helper to recursively extract and register parameters (destructuring, defaults, rest, etc.)
    const registerParamIdentifiers = (paramNode: any, scope: ScopeFrame) => {
      if (!paramNode) return;
      
      if (paramNode.type === 'Identifier') {
        const name = paramNode.name;
        const line = paramNode.loc?.start.line || 1;
        scope.variables.set(name, {
          name,
          line,
          kind: 'let',
          reassigned: false,
          referenced: false
        });
      } else if (paramNode.type === 'AssignmentPattern') {
        registerParamIdentifiers(paramNode.left, scope);
      } else if (paramNode.type === 'ObjectPattern') {
        paramNode.properties.forEach((prop: any) => {
          if (prop.type === 'Property') {
            registerParamIdentifiers(prop.value, scope);
          } else if (prop.type === 'RestElement') {
            registerParamIdentifiers(prop.argument, scope);
          }
        });
      } else if (paramNode.type === 'ArrayPattern') {
        paramNode.elements.forEach((elem: any) => {
          if (elem) registerParamIdentifiers(elem, scope);
        });
      } else if (paramNode.type === 'RestElement') {
        registerParamIdentifiers(paramNode.argument, scope);
      }
    };

    const traverse = (
      node: any, 
      currentScope: ScopeFrame, 
      parentNode?: any, 
      parentKey?: string, 
      inPattern: boolean = false
    ) => {
      if (!node) return;

      let nextScope = currentScope;

      // Create a new scope on functions or block boundary declarations
      const isNewScope = node.type === 'FunctionDeclaration' || 
                         node.type === 'FunctionExpression' || 
                         node.type === 'ArrowFunctionExpression' ||
                         node.type === 'BlockStatement';

      if (isNewScope) {
        nextScope = {
          variables: new Map(),
          parent: currentScope
        };

        // If this block belongs to a CatchClause, register the catch variable in this block's scope
        if (node.type === 'BlockStatement' && parentNode && parentNode.type === 'CatchClause' && parentNode.param) {
          registerParamIdentifiers(parentNode.param, nextScope);
        }
      }

      // Pre-scan and register hoisted function declarations in this scope's block
      if (node.body) {
        const bodyNodes = Array.isArray(node.body) 
          ? node.body 
          : (Array.isArray(node.body.body) ? node.body.body : []);
          
        bodyNodes.forEach((child: any) => {
          if (child && child.type === 'FunctionDeclaration' && child.id && child.id.type === 'Identifier') {
            const name = child.id.name;
            const line = child.loc?.start.line || 1;
            nextScope.variables.set(name, {
              name,
              line,
              kind: 'function',
              reassigned: false,
              referenced: false
            });
          }
        });
      }

      // Register function parameters in the function scope
      if (
        (node.type === 'FunctionDeclaration' || 
         node.type === 'FunctionExpression' || 
         node.type === 'ArrowFunctionExpression') && 
        node.params
      ) {
        node.params.forEach((param: any) => {
          registerParamIdentifiers(param, nextScope);
        });
      }

      // 1. Process ESM imports
      if (node.type === 'ImportDeclaration') {
        node.specifiers.forEach((spec: any) => {
          if (spec.local && spec.local.type === 'Identifier') {
            const name = spec.local.name;
            const line = node.loc?.start.line || 1;
            nextScope.variables.set(name, {
              name,
              line,
              kind: 'const', // imports are immutable
              reassigned: false,
              referenced: false
            });
          }
        });
      }

      // 2. Process variable declarations
      if (node.type === 'VariableDeclaration') {
        const kind = node.kind; // var, let, or const
        node.declarations.forEach((decl: any) => {
          if (decl.id.type === 'Identifier') {
            const name = decl.id.name;
            const line = decl.loc?.start.line || 1;

            // Shadowing validation: search outer scopes for duplicate names
            let parent = currentScope;
            let isShadowed = false;
            while (parent) {
              if (parent.variables.has(name)) {
                isShadowed = true;
                break;
              }
              parent = parent.parent!;
            }

            if (isShadowed && !['err', 'error', '_'].includes(name)) {
              shadowIssues.push({ line, name });
            }

            nextScope.variables.set(name, {
              name,
              line,
              kind,
              reassigned: false,
              referenced: false
            });
          } else {
            // Destructured variable declaration
            registerParamIdentifiers(decl.id, nextScope);
          }
        });
      }

      // 3. Process function declarations (Only register if not pre-scanned, though map overrides safely)
      if (node.type === 'FunctionDeclaration' && node.id && node.id.type === 'Identifier') {
        const name = node.id.name;
        const line = node.loc?.start.line || 1;
        currentScope.variables.set(name, {
          name,
          line,
          kind: 'function',
          reassigned: false,
          referenced: false
        });
      }

      // 4. Process assignments and reassignments
      if (node.type === 'AssignmentExpression' && node.left.type === 'Identifier') {
        const name = node.left.name;
        let parent: ScopeFrame | null = currentScope;
        while (parent) {
          if (parent.variables.has(name)) {
            const v = parent.variables.get(name)!;
            v.reassigned = true;
            v.referenced = true; // assignment acts as a reference trigger
            break;
          }
          parent = parent.parent;
        }
      }

      if (node.type === 'UpdateExpression' && node.argument.type === 'Identifier') {
        const name = node.argument.name;
        let parent: ScopeFrame | null = currentScope;
        while (parent) {
          if (parent.variables.has(name)) {
            const v = parent.variables.get(name)!;
            v.reassigned = true;
            v.referenced = true;
            break;
          }
          parent = parent.parent;
        }
      }

      // 5. Track and check identifier reference reads (Variables & Functions)
      if (node.type === 'Identifier') {
        const name = node.name;

        // Determine if this identifier is in a reference read context
        let isReference = !inPattern;

        if (isReference && parentNode) {
          // Additional safety checks for non-reference contexts
          if (
            (parentNode.type === 'FunctionDeclaration' || 
             parentNode.type === 'FunctionExpression' || 
             parentNode.type === 'ClassDeclaration' || 
             parentNode.type === 'ClassExpression') && 
            parentKey === 'id'
          ) {
            isReference = false;
          } else if (
            parentNode.type === 'Property' && 
            parentKey === 'key' && 
            !parentNode.computed && 
            !parentNode.shorthand
          ) {
            isReference = false;
          } else if (
            parentNode.type === 'MethodDefinition' && 
            parentKey === 'key' && 
            !parentNode.computed
          ) {
            isReference = false;
          } else if (
            parentNode.type === 'MemberExpression' && 
            parentKey === 'property' && 
            !parentNode.computed
          ) {
            isReference = false;
          } else if (
            parentNode.type === 'ImportSpecifier' || 
            parentNode.type === 'ImportDefaultSpecifier' || 
            parentNode.type === 'ImportNamespaceSpecifier'
          ) {
            isReference = false;
          } else if (parentNode.type === 'ExportSpecifier') {
            isReference = false;
          } else if (
            (parentNode.type === 'BreakStatement' || 
             parentNode.type === 'ContinueStatement' || 
             parentNode.type === 'LabeledStatement') && 
            parentKey === 'label'
          ) {
            isReference = false;
          }
        }

        if (isReference) {
          let isDefined = false;
          let parent: ScopeFrame | null = currentScope;
          while (parent) {
            if (parent.variables.has(name)) {
              isDefined = true;
              const v = parent.variables.get(name)!;
              const nodeLine = node.loc?.start.line || 1;
              if (nodeLine !== v.line) {
                v.referenced = true;
              }
              break;
            }
            parent = parent.parent;
          }

          if (!isDefined && !BUILT_INS.has(name)) {
            const line = node.loc?.start.line || 1;
            
            // Check if this identifier is being called directly as a function
            const isCallExpr = parentNode && parentNode.type === 'CallExpression' && parentKey === 'callee';
            
            if (isCallExpr) {
              issues.push({
                id: `scope-undefined-func-${Date.now()}-${line}-${name}`,
                ruleId: 'scope',
                severity: 'critical',
                line,
                message: `Undefined Function Invocation ('${name}')`,
                explanation: `The function '${name}' is invoked directly but is not declared, imported, or present in standard global environments. At runtime, this will immediately raise a fatal 'ReferenceError: ${name} is not defined' and halt execution.`,
                suggestion: `Verify the spelling of '${name}', declare the function, or import the module that exports it.`
              });
            } else {
              issues.push({
                id: `scope-undefined-var-${Date.now()}-${line}-${name}`,
                ruleId: 'scope',
                severity: 'critical',
                line,
                message: `Undefined Variable Reference ('${name}')`,
                explanation: `The variable '${name}' is referenced but is not declared, imported, or present in standard global environments. At runtime, referencing a non-existent identifier will immediately raise a fatal 'ReferenceError: ${name} is not defined' and halt execution.`,
                suggestion: `Verify the spelling of '${name}', declare the variable (using const, let, or var), or import it.`
              });
            }
          }
        }
      }

      // Recurse children
      for (const key in node) {
        if (Object.prototype.hasOwnProperty.call(node, key)) {
          const val = node[key];

          // Determine next inPattern status
          let nextInPattern = inPattern;
          if (node.type === 'VariableDeclarator' && key === 'id') {
            nextInPattern = true;
          } else if (
            (node.type === 'FunctionDeclaration' || 
             node.type === 'FunctionExpression' || 
             node.type === 'ArrowFunctionExpression') && 
            key === 'params'
          ) {
            nextInPattern = true;
          } else if (node.type === 'AssignmentExpression' && key === 'left') {
            nextInPattern = true;
          } else if (node.type === 'CatchClause' && key === 'param') {
            nextInPattern = true;
          } else if (node.type === 'AssignmentPattern' && key === 'right') {
            nextInPattern = false;
          }

          if (Array.isArray(val)) {
            val.forEach(child => traverse(child, nextScope, node, key, nextInPattern));
          } else if (val && typeof val === 'object' && typeof val.type === 'string') {
            traverse(val, nextScope, node, key, nextInPattern);
          }
        }
      }

      // Upon leaving this specific scope block, catalog unused / let immutability metrics
      if (isNewScope) {
        nextScope.variables.forEach(v => {
          if (v.kind !== 'function' && !['i', 'j', 'k', 'err', 'error', '_'].includes(v.name)) {
            if (!v.referenced) {
              unusedVars.push(v);
            }
            if (v.kind === 'let' && !v.reassigned && v.referenced) {
              immutableLets.push(v);
            }
          }
        });
      }
    };

    const globalScope: ScopeFrame = {
      variables: new Map(),
      parent: null
    };

    // Pre-scan global hoisted functions
    if (ast.body) {
      ast.body.forEach((child: any) => {
        if (child && child.type === 'FunctionDeclaration' && child.id && child.id.type === 'Identifier') {
          const name = child.id.name;
          const line = child.loc?.start.line || 1;
          globalScope.variables.set(name, {
            name,
            line,
            kind: 'function',
            reassigned: false,
            referenced: false
          });
        }
      });
    }

    traverse(ast, globalScope);

    // Audit global scope variables at the root AST level
    globalScope.variables.forEach(v => {
      if (v.kind !== 'function' && !['i', 'j', 'k', 'err', 'error', '_'].includes(v.name)) {
        if (!v.referenced) {
          unusedVars.push(v);
        }
        if (v.kind === 'let' && !v.reassigned && v.referenced) {
          immutableLets.push(v);
        }
      }
    });

    // Report shadow warnings
    shadowIssues.forEach(s => {
      issues.push({
        id: `scope-shadow-${Date.now()}-${s.line}-${s.name}`,
        ruleId: 'scope',
        severity: 'warning',
        line: s.line,
        message: `Variable Shadowing Detected ('${s.name}')`,
        explanation: `Variable '${s.name}' is declared inside a nested block with the same identifier name as a variable in an outer scope. This shadows the parent field, creating high potential for accidental reassignments and cognitive confusion.`,
        suggestion: `Rename the inner block variable '${s.name}' to a unique descriptive label.`
      });
    });

    // Report unused dead identifiers
    unusedVars.forEach(v => {
      issues.push({
        id: `scope-unused-${Date.now()}-${v.line}-${v.name}`,
        ruleId: 'scope',
        severity: 'info',
        line: v.line,
        message: `Unused Variable ('${v.name}')`,
        explanation: `Variable '${v.name}' is declared but never referenced or read in outer scopes. Unused dead variables pollute code cleanliness and bloat diagnostic settings.`,
        suggestion: `Remove the unused declaration of '${v.name}' to declutter the file.`
      });
    });

    // Report immutable let bindings
    immutableLets.forEach(v => {
      issues.push({
        id: `scope-immutable-${Date.now()}-${v.line}-${v.name}`,
        ruleId: 'scope',
        severity: 'info',
        line: v.line,
        message: `Immutable let Declared ('${v.name}')`,
        explanation: `Variable '${v.name}' is declared using the reassignable 'let' binding but is never reassigned in the scope. Enforcing 'const' declarations is a best practice.`,
        suggestion: `Change the declaration of '${v.name}' from 'let' to 'const' to enforce read-only semantics.`
      });
    });

    return issues;
  },

  getThinkingStep(code: string): ThinkingStep {
    const issues = this.analyze(code, []);
    const shadows = issues.filter(i => i.message.includes('Shadowing'));
    const unused = issues.filter(i => i.message.includes('Unused'));
    const immutables = issues.filter(i => i.message.includes('Immutable'));
    const undefinedFuncs = issues.filter(i => i.message.includes('Undefined Function'));
    const undefinedVars = issues.filter(i => i.message.includes('Undefined Variable'));

    let observation = 'Compiling global lexical scope blocks, tracking duplicate naming layers, and referencing read actions. ';
    let conclusion = '';

    if (issues.length > 0) {
      observation += `Flagged ${shadows.length} naming shadows, ${unused.length} unused variables, ${immutables.length} let variables that could be const, ${undefinedFuncs.length} undefined function calls, and ${undefinedVars.length} undefined variable references.`;
      conclusion = `Lexical scope integrity contains vulnerabilities. Eliminating undefined function calls and unresolved variable references is a high-priority action to prevent runtime ReferenceErrors.`;
    } else {
      observation += `Variable reference scopes are cleanly isolated. Zero unused bindings, shadowing conflicts, or mutable blocks found.`;
      conclusion = `Excellent lexical scope health and variable isolation profiles.`;
    }

    return {
      phase: 'Lexical Scope & Shadowing Audit',
      observation,
      conclusion
    };
  }
};
