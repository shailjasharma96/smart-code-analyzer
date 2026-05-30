# Smart Code Analyzer

A high-performance, React-based static code analysis application designed for JavaScript and Node.js. It simulates sophisticated "AI-style reasoning" in real-time using in-browser **AST parsing** and regex heuristics, complete with a step-by-step sequential thinking trace and dynamic quality dashboards—**no LLMs, no external AI APIs, and absolute privacy.**

---

## 1. Architecture & Approach

This application is built with a decoupled three-layer architecture: the **UI/State Layer**, the **Analytical Orchestrator**, and the **Rule Pipeline**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              UI VIEW LAYER                             │
│       CodeMirror Editor  │  Diagnostics Tab  │  History Drawer        │
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
                        │ Walk AST                  │ Apply transforms
┌───────────────────────▼───────────┐   ┌───────────▼────────────────────┐
│           RULE ENGINE             │   │        REFACTOR ENGINE         │
│  - complexity.rule                │   │  Line-targeted transformations │
│  - naming.rule                    │   │  resolving var keywords,       │
│  - async.rule                     │   │  loose comparison types, empty │
│  - errorHandling.rule             │   │  catch swallowing, and missing │
│  - performance.rule               │   │  Logical environment fallbacks.│
│  - security.rule                  │   └────────────────────────────────┘
│  - bestPractice.rule              │
│  - nodeSpecific.rule              │
└───────────────────────────────────┘
```

### Key Architectural Patterns
* **Rule Pipeline Pattern**: Each code analysis rule is implemented as an isolated, self-contained module conforming to a strict TS contract. This ensures rules can be developed, tested, and enabled/disabled independently without modifying the orchestrator core.
* **Hybrid Parser Strategy**: 
  - To achieve genuine code understanding, the engine utilizes **Acorn** to parse the code into an **Abstract Syntax Tree (AST)** for recursive node traversal.
  - If a fatal compilation or syntax error is present in the code, the AST parser throws an exception. The engine traps this, reports a critical syntax issue pinpointing the error line/column, and gracefully falls back to **regex-only heuristics** to remain completely resilient.
* **Decoupled State**: Global state is coordinated using a lightweight **Zustand** store, decoupling react visual renders from analytical CPU computation blocks.

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
2. The **Reasoning Drawer** renders steps one-by-one (`visibleSteps` increments from 0 to 9).
3. The latest reasoning line displays a blinking block cursor and typewriter observational logs.
4. Once the final rule completes, `isAnalyzing` is disabled, triggering a smooth fade-in transitions that loads the score ring, recharts radar, and actionable checklist.

---

## 3. Rules Implemented

The pipeline executes **8 distinct rules** across essential clean-code and security guidelines:

1. **`complexity.rule.ts` (Cyclomatic Complexity)**: Walks the AST to count linearly independent logic paths (conditional `if` statements, loops (`for`/`while`), switch cases, ternary indicators, and compound logical short-circuits `&&`/`||`). Flags blocks exceeding a complexity threshold of 12.
2. **`naming.rule.ts` (Naming Conventions)**: Audits variable declarations, function definitions, and classes to identify single-character names (exempting loop index counters like `i`/`j`), generic names (such as `temp`, `data`, or `foo`), and invalid variable cases (recommending `camelCase` for properties and `PascalCase` for classes).
3. **`async.rule.ts` (Asynchronous Programming)**: Traces anonymous callback function parameters within CallExpressions to detect deep callback nesting (Pyramid of Doom / Callback Hell) exceeding 2 levels.
4. **`errorHandling.rule.ts` (Error Robustness)**: Scans for async awaits residing outside protected `try/catch` scopes, flags empty `catch` blocks that swallow errors silently, and warns about console-only error reporting.
5. **`performance.rule.ts` (Performance Bottlenecks)**: Flags thread-blocking synchronous APIs (like Node's legacy `fs.readFileSync`). Scans for O(N²) nested loops and linear array searches (`indexOf`, `includes`) executing inside iterator blocks.
6. **`security.rule.ts` (Vulnerability Audit)**: Audits for dangerous remote code execution (`eval()` and `new Function()`), hardcoded production secrets/API keys (using high-entropy regex), SQL injection vulnerabilities (passing string interpolations to database query methods), and OS command injections.
7. **`bestPractice.rule.ts` (Clean Code Standards)**: Flags scope-leaky variables (`var`), loose equality type coercions (`==` and `!=`), and leftover diagnostics (`console.log`).
8. **`nodeSpecific.rule.ts` (Node & Module Hygiene)**: Audits for legacy CommonJS `require()` modular structures in ESM-configured environments, and flags unsafe `process.env` lookups missing Logical fallback variables.

---

## 4. Scoring Algorithm

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

## 5. Technical Stack

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

## 6. Trade-offs & Future Work

### Parser Speed vs. Lexical Accuracy
* **Trade-off**: Simple regex checks are extremely fast (<1ms) but lack scoping awareness, potentially flagging keywords inside block comments or strings. Conversely, AST parsing using `acorn` builds a complete structural scope tree for accurate validation, but is unable to execute if the source document contains broken syntax.
* **Approach**: We utilize a **resilient hybrid compiler**. The engine runs AST traversals as the default pipeline, falling back instantly to raw regex scans if the compiler encounters a fatal syntax error.

### AI Engine Scale and LLM Integrations
* **Trade-off**: Running purely client-side ensures absolute speed, zero cost, and 100% privacy since code never leaves the user's browser. However, rule-based heuristics cannot provide the deep, human-like architectural reasoning of a large neural network model.
* **Future Work**: Build a togglable AI connector frame where developers can securely supply an API key (e.g. Anthropic Claude 3.5 Sonnet) to enrich heuristic warnings with fully generated custom refactoring patches.

---

## 7. Local Installation & Development

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
