import React, { useRef, useEffect } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { SAMPLE_CODES } from '../../constants/sampleCode';
import { Play, Sparkles, FileCode, CheckCircle2, AlertTriangle } from 'lucide-react';

export const CodeEditor: React.FC = () => {
  const { 
    code, 
    setCode, 
    triggerAnalysis, 
    isAnalyzing, 
    highlightedLine, 
    setHighlightedLine,
    result 
  } = useAnalysisStore();
  
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  // Pre-load the clean code exemplar on initial startup if empty
  useEffect(() => {
    if (!code) {
      // Find the clean code sample or first sample
      const initial = SAMPLE_CODES.find(s => s.id === 'callback-hell') || SAMPLE_CODES[0];
      setCode(initial.code);
    }
  }, [code, setCode]);

  // Jump to and select line when highlightedLine changes
  useEffect(() => {
    if (highlightedLine && editorRef.current?.view) {
      const view = editorRef.current.view;
      const doc = view.state.doc;
      
      // Safety clamp
      const lineNum = Math.min(Math.max(1, highlightedLine), doc.lines);
      const lineObj = doc.line(lineNum);
      
      // Focus the editor
      view.focus();
      
      // Dispatch selection to highlight the line
      view.dispatch({
        selection: { anchor: lineObj.from, head: lineObj.to },
        scrollIntoView: true
      });
      
      // Reset after a brief flash delay
      const timer = setTimeout(() => {
        setHighlightedLine(null);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [highlightedLine, setHighlightedLine]);

  const handleSampleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = SAMPLE_CODES.find(s => s.id === e.target.value);
    if (selected) {
      setCode(selected.code);
    }
  };

  const handleApplyRefactor = () => {
    const { applyRefactoredCode } = useAnalysisStore.getState();
    applyRefactoredCode();
  };

  // Find the selected sample ID
  const selectedSampleId = SAMPLE_CODES.find(s => s.code === code)?.id || '';

  return (
    <div className="flex flex-col h-full terminal-card neon-border-glow overflow-hidden">
      {/* Editor Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-neutral-900/90 border-b border-neutral-800/80">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 block"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 block"></span>
            <span className="w-3 h-3 rounded-full bg-green-500/80 block"></span>
          </div>
          <div className="ml-3 flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
            <FileCode size={14} className="text-cyan-400" />
            <span>index.js</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sample Select */}
          <div className="flex items-center gap-2">
            <label htmlFor="sample-code-select" className="text-xs text-neutral-400 font-mono hidden sm:inline">Demo Snippet:</label>
            <select
              id="sample-code-select"
              value={selectedSampleId}
              onChange={handleSampleChange}
              className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 font-mono rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 max-w-[200px]"
            >
              <option value="" disabled>-- Load Snippet --</option>
              {SAMPLE_CODES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Refactor Apply (If refactoredCode exists in result) */}
          {result?.refactoredCode && (
            <button
              onClick={handleApplyRefactor}
              className="flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs px-3 py-1.5 rounded border border-emerald-500/20 shadow-lg shadow-emerald-950/20 transition-all font-semibold"
            >
              <Sparkles size={13} className="animate-pulse" />
              <span>Apply Fix</span>
            </button>
          )}

          {/* Analyze CTA */}
          <button
            onClick={triggerAnalysis}
            disabled={isAnalyzing || !code.trim()}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white font-mono text-xs px-3.5 py-1.5 rounded border border-cyan-500/20 shadow-lg shadow-cyan-950/30 transition-all font-semibold"
          >
            <Play size={13} fill="currentColor" className={isAnalyzing ? 'animate-spin' : ''} />
            <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Code'}</span>
          </button>
        </div>
      </div>

      {/* CodeMirror Text Editor */}
      <div className="flex-1 relative font-mono text-sm overflow-auto bg-neutral-950">
        <CodeMirror
          ref={editorRef}
          value={code}
          height="100%"
          extensions={[javascript({ jsx: true })]}
          onChange={(val) => setCode(val)}
          theme="dark"
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            syntaxHighlighting: true,
          }}
          className="h-full focus:outline-none"
        />

        {/* Floating Analyzer active scanning animation overlay when isAnalyzing is true */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-cyan-950/5 pointer-events-none overflow-hidden border border-cyan-500/20">
            <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#06b6d4] terminal-scanline"></div>
          </div>
        )}
      </div>
      
      {/* Editor Footer Status */}
      <div className="px-4 py-1.5 bg-neutral-900 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
        <div>UTF-8</div>
        <div className="flex items-center gap-3">
          {result ? (
            <div className="flex items-center gap-1">
              {result.issues.length > 0 ? (
                <>
                  <AlertTriangle size={11} className="text-yellow-500" />
                  <span>{result.issues.length} issues flagged</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={11} className="text-emerald-500" />
                  <span>Code conforms perfectly</span>
                </>
              )}
            </div>
          ) : (
            <span>Ready for parsing</span>
          )}
          <span>JavaScript (ESM)</span>
        </div>
      </div>
    </div>
  );
};
