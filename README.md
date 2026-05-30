# Smart Code Analyzer

A high-performance, React-based static code analysis application designed for JavaScript and Node.js. It simulates sophisticated "AI-style reasoning" in real-time using in-browser **AST parsing** and regex heuristics, complete with a step-by-step sequential thinking trace and dynamic quality dashboards—**no LLMs, no external AI APIs, and absolute privacy.**

---

## 1. Architecture & Approach

This application is built with a decoupled three-layer architecture: the **UI/State Layer**, the **Analytical Orchestrator**, and the **Rule Pipeline**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              UI VIEW LAYER                             │
│  Editor  │  Summary Tab  │  Suggestions Tab  │  Issues Tab  │ Refactor │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Updates state / code input
┌───────────────────────────────────▼────────────────────────────────────┐
│                         ZUSTAND GLOBAL STORE                           │
│     Manages active tabs, editor line flash triggers, scan status,      │
│     history caching (localStorage), and sequential step animations     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Triggers analysis
┌───────────────────────────────────▼────────────────────────────────────┐
│                        ANALYST ORCHESTRATOR                            │
│     Splits code, coordinates parsing, triggers rules sequentially,     │
│     calculates scores, and returns standard AnalysisResult             │
└───────────────────────┬───────────────────────────┬────────────────────┘
                        │ Walk AST                  │ Apply transforms & re-run
┌───────────────────────▼───────────┐   ┌───────────▼────────────────────┐
│           RULE ENGINE             │   │        REFACTOR ENGINE         │
│  - complexity.rule                │   │  Line-targeted transformations │
│  - naming.rule                    │   │  resolving var, loose checks,  │
│  - async.rule                     │   │  try/catch wrapping, parameter │
│  - errorHandling.rule             │   │  SQL queries, sync to async,   │
│  - performance.rule               │   │  and auto stubbing of undefined│
│  - security.rule                  │   │  references. Triggers feedback │
│  - bestPractice.rule              │   │  loop to improve score cards.  │
│  - nodeSpecific.rule              │   └────────────────────────────────┘
│  - scope.rule [NEW]               │
└───────────────────────────────────┘
```

### Key Architectural Patterns
* **Rule Pipeline Pattern**: Each code analysis rule is implemented as an isolated, self-contained module conforming to a strict TS contract. This ensures rules can be developed, tested, and enabled/disabled independently without modifying the orchestrator core.
* **Interactive Rules Config Panel**: A sliding drawer configuration panel allows developers to selectively enable and disable rules (e.g. toggling off Lexical Scope or Naming Rules) with immediate, hot-reloading diagnostics updates.
* **Hybrid Parser Strategy**: 
  - To achieve genuine code understanding, the engine utilizes **Acorn** to parse the code into an **Abstract Syntax Tree (AST)** for recursive node traversal.
  - If a fatal compilation or syntax error is present in the code, the AST parser throws an exception. The engine traps this, reports a critical syntax issue pinpointing the error line/column, and gracefully falls back to **regex-only heuristics** to remain completely resilient.
* **Decoupled State**: Global state is coordinated using a lightweight **Zustand** store, decoupling React visual renders from analytical CPU computation blocks.

---

## 2. AI Thinking Simulation

The defining feature of the Smart Code Analyzer is its interactive **Thinking Trace Console**. Rather than instantly dumping raw linting errors, it simulates a live, step-by-step reasoning cycle mimicking how a real AI agent dissects files.

### The Reasoning Pipeline
Every rule implements the standard `Rule` interface:

```typescript
export interface Rule {
  id: string;
  name: string;
  description: string;
  analyze(code: string, lines: string[]): Issue[];
  getThinkingStep(code: string): ThinkingStep;
}
```

* `.analyze()` scans the AST or regex boundaries to return specific structured issues.
* `.getThinkingStep()` is called by the orchestrator to extract a **phase label**, a **specific code observation**, and a **structural conclusion**.

### Typewriter Sequencing Animation
When a user clicks "Analyze Code", the Zustand store runs the engine instantly in the background, caching the complete `thinkingTrace`. 

A 150ms step interval begins:
1. An animated **scanner line** pulses across the CodeMirror viewport.
2. The **Reasoning Drawer** renders steps one-by-one (`visibleSteps` increments).
3. The latest reasoning line displays a blinking block cursor and typewriter observational logs.
4. Once the final rule completes, `isAnalyzing` is disabled, triggering smooth fade-in transitions that load the score ring, recharts radar, and actionable checklist.

---

## 3. Rules Implemented

The pipeline executes **9 distinct rules** across essential clean-code, scope, and security guidelines:

1. **`complexity.rule.ts` (Cyclomatic Complexity)**: Walks the AST to count linearly independent logic paths (conditional `if` statements, loops (`for`/`while`), switch cases, ternary indicators, and compound logical short-circuits `&&`/`||`). Flags blocks exceeding a complexity threshold of 12.
2. **`naming.rule.ts` (Naming Conventions)**: Audits variable declarations, function definitions, and classes to identify single-character names (exempting loop index counters like `i`/`j`), generic names (such as `temp`, `data`, or `foo`), and invalid variable cases (recommending `camelCase` for properties and `PascalCase` for classes).
3. **`async.rule.ts` (Asynchronous Programming)**: Traces callback function parameters within CallExpressions to detect deep callback nesting (Pyramid of Doom / Callback Hell) exceeding 2 levels.
4. **`errorHandling.rule.ts` (Error Robustness)**: Scans for async awaits residing outside protected `try/catch` scopes, flags empty `catch` blocks that swallow errors silently, and warns about console-only error reporting.
5. **`performance.rule.ts` (Performance Bottlenecks)**: Flags thread-blocking synchronous APIs (like Node's legacy `fs.readFileSync`). Scans for O(N²) nested loops and linear array searches (`indexOf`, `includes`) executing inside iterator blocks.
6. **`security.rule.ts` (Vulnerability Audit)**: Audits for dangerous remote code execution (`eval()` and `new Function()`), hardcoded production secrets/API keys (using high-entropy regex), SQL injection vulnerabilities (passing string interpolations to database query methods), and OS command injections.
7. **`bestPractice.rule.ts` (Clean Code Standards)**: Flags scope-leaky variables (`var`), loose equality type coercions (`==` and `!=`), and leftover diagnostics (`console.log`).
8. **`nodeSpecific.rule.ts` (Node & Module Hygiene)**: Audits for legacy CommonJS `require()` modular structures in ESM-configured environments, and flags unsafe `process.env` lookups missing Logical fallback variables.
9. **`scope.rule.ts` (Lexical Scope & Shadowing Engine) [NEW]**: Implements a compiler-grade scope chain auditor tracking:
   - **Variable Shadowing**: Flags nested identifiers duplicate-naming outer scope bindings.
   - **Unused Dead Identifiers**: Detects variables declared but never read or referenced.
   - **Immutable Let Warnings**: Encourages `let` reassignment structures to be declared using read-only `const`.
   - **Hoisting Support**: Implements hoisting pre-scans that catalog function definitions before walking deep execution nodes.
   - **Destructuring Parameters**: Recursively registers object/array pattern destructuring variable declarators, function parameters, and catch block parameters.
   - **Generalized Undefined References**: Audits all JavaScript Identifier nodes and reports Critical `Undefined Function Invocation` warnings for direct calls or Critical `Undefined Variable Reference` warnings for callback assignments and reads.

---

## 4. Advanced Refactor & Feedback Loop

The **Refactor Engine** (`src/engine/refactor/refactorEngine.ts`) performs safe, line-targeted code optimizations that can be applied directly to the editor.

### Refactoring Capabilities
* **Reference Stub Generation**: Auto-declares missing function and variable stubs (e.g. `function foo() { ... }` or `const bar = null;`) at the bottom of the file to eliminate runtime `ReferenceError` crashes.
* **Try/Catch Safe Wrappers**: Wraps unprotected await statements inside a robust, structured `try/catch` block.
* **SQL Injection Parameterization**: Automatically detects vulnerable string concatenation queries (e.g. `"SELECT * FROM users WHERE id = '" + val + "'"`), converting them into parameterized queries (`"SELECT * FROM users WHERE id = ?"`, `[val]`).
* **Sync to Async Promises Upgrade**: Replaces synchronous blocking calls (e.g. `fs.readFileSync`) with non-blocking promises equivalents (`fs.promises.readFile` with appropriate `await` injection).
* **eval() Safeguard**: Comments out dangerous `eval()` blocks, appending visual warnings and logs.
* **Naming Casing Standardizer**: Resolves camelCase and PascalCase violations (converting snake_case variables and lowercase class declarations into proper casing).
* **Legacy Cleanups**: Converts legacy `var` to `const` and loose `==`/`!=` comparisons to strict `===`/`!==`.

### Verification Feedback Loop
When a developer clicks **"Apply to Editor"** in the Refactor column:
1. The CodeMirror editor state instantly updates with the refactored, smell-free code.
2. The Zustand store **automatically triggers a fresh static code analysis run**.
3. The quality dashboards and Recharts radar charts update dynamically to show the **improved score (e.g. moving from 27 to 95+)**, celebrated with a confetti burst.

---

## 5. Dedicated Suggestions Tab

Suggestions are organized into a dedicated **Suggestions Tab** in the main diagnostics dashboard. It includes:
* **Interactive Suggestions Badges**: A visual numeric badge displaying active suggestion counts.
* **Structured Suggestions Panel**: Actionable items presented with glowing cyberpunk-style numeric badges (`01`, `02`, etc.) and structured list item outlines that change to a cyan glow on hover.
* **Quick Navigation**: A summary-level quick link card placed on the `Summary` tab to jump directly to the detailed Suggestions view.

---

## 6. Scoring Algorithm

The application computes a normalized quality score between **0 and 100** based on a tiered deduction model:

$$\text{Quality Score} = 100 - (\text{Critical Deductions} + \text{Warning Deductions} + \text{Info Deductions})$$

### Penalty Rules
* **Critical Issue**: `-15 points` each (deduction capped at a maximum of **-45**).
* **Warning Issue**: `-5 points` each (deduction capped at a maximum of **-25**).
* **Info Issue**: `-1 point` each (deduction capped at a maximum of **-10**).

The resulting score resolves to a semantic quality tier:
* **90–100**: "Excellent" (Triggers a canvas-confetti celebration overlay)
* **70–89**: "Good" (Teal/cyan visual themes)
* **50–69**: "Needs Improvement" (Yellow styling alerts)
* **0–49**: "Poor" (Crimson red warning indicators)

---

## 7. Technical Stack

| Layer | Choice |
|---|---|
| **Core Framework** | React 18 (Vite Scaffolding) |
| **Language** | TypeScript (Strict Typings) |
| **Styling** | Tailwind CSS |
| **Global State** | Zustand |
| **Code Editor** | CodeMirror 6 (`@uiw/react-codemirror`) |
| **Data Visualization** | Recharts (5-Axis Radar Chart) |
| **Parsing Engine** | Acorn (AST compiler) |
| **Storage Persistence** | LocalStorage (History Drawer) |
| **Unit Testing** | Vitest (Mock compiler specs) |

---

## 8. Local Installation & Development

To clone, set up, and execute the Smart Code Analyzer locally:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Launch Development Server**:
   ```bash
   npm run dev
   ```

3. **Compile Production Build**:
   ```bash
   npm run build
   ```

4. **Execute Automated Unit Tests**:
   ```bash
   npx vitest run
   ```
