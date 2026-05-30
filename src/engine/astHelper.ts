import * as acorn from 'acorn';

export function parseAST(code: string): any {
  try {
    return acorn.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
    });
  } catch (err) {
    // Return null if parsing fails (syntax error), allowing rules to fall back to regex
    return null;
  }
}

export function walkAST(node: any, visit: (node: any) => void) {
  if (!node || typeof node !== 'object') return;
  
  visit(node);
  
  for (const key in node) {
    if (Object.prototype.hasOwnProperty.call(node, key)) {
      const val = node[key];
      if (Array.isArray(val)) {
        val.forEach(child => walkAST(child, visit));
      } else if (val && typeof val === 'object' && typeof val.type === 'string') {
        walkAST(val, visit);
      }
    }
  }
}
