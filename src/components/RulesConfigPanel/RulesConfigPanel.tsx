import React from 'react';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { X, Settings, Shield, Cpu, Tag, RefreshCw, ToggleLeft, ToggleRight, Layers, Eye } from 'lucide-react';

interface RulesConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesConfigPanel: React.FC<RulesConfigPanelProps> = ({ isOpen, onClose }) => {
  const { ruleToggles, toggleRule } = useAnalysisStore();

  // Rule catalog descriptions and icons
  const RULE_INFO = [
    {
      id: 'complexity',
      name: 'Cyclomatic Complexity Heuristics',
      category: 'Complexity',
      description: 'Measures structural branch depth, loops, and conditions.',
      severity: 'Critical / Warning',
      icon: <Cpu size={16} className="text-yellow-500" />
    },
    {
      id: 'naming',
      name: 'Naming Conventions Audit',
      category: 'Naming',
      description: 'Checks for single-character identifiers and irregular casing.',
      severity: 'Warning / Info',
      icon: <Tag size={16} className="text-cyan-500" />
    },
    {
      id: 'async',
      name: 'Asynchronous Programming Scan',
      category: 'Async',
      description: 'Identifies anonymous callback hell nesting levels exceeding 2.',
      severity: 'Critical / Warning',
      icon: <RefreshCw size={16} className="text-purple-400" />
    },
    {
      id: 'errorHandling',
      name: 'Error Handling & Robustness',
      category: 'Error',
      description: 'Checks for unprotected awaits and empty catch swallowing.',
      severity: 'Critical / Warning',
      icon: <Shield size={16} className="text-red-500" />
    },
    {
      id: 'performance',
      name: 'Performance & Event Loop Blocks',
      category: 'Performance',
      description: 'Audits blocking sync calls and nested array scans inside loops.',
      severity: 'Critical / Warning',
      icon: <Cpu size={16} className="text-emerald-500" />
    },
    {
      id: 'security',
      name: 'Security & Vulnerability Audit',
      category: 'Security',
      description: 'Audits eval() commands, hardcoded secrets, and SQL concatenations.',
      severity: 'Critical Only',
      icon: <Shield size={16} className="text-red-600 font-bold" />
    },
    {
      id: 'bestPractice',
      name: 'Clean Code & Best Practices',
      category: 'Best Practices',
      description: 'Flags legacy var keywords, loose == checking, and console.logs.',
      severity: 'Warning / Info',
      icon: <Layers size={16} className="text-blue-400" />
    },
    {
      id: 'nodeSpecific',
      name: 'Environment & Module Hygiene',
      category: 'Node specific',
      description: 'Checks for CommonJS require module usage and process.env fallbacks.',
      severity: 'Warning / Info',
      icon: <Layers size={16} className="text-cyan-400" />
    },
    {
      id: 'scope',
      name: 'Lexical Scope & Shadowing Audits',
      category: 'Lexical Scopes',
      description: 'Tracks local variables, duplicate shadows, and let -> const upgrades.',
      severity: 'Warning / Info',
      icon: <Eye size={16} className="text-blue-500" />
    }
  ];

  return (
    <>
      {/* Background Dimmer Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-all duration-300"
        />
      )}

      {/* Slide-Over Drawer Container (Left Aligned) */}
      <div 
        className={`fixed top-0 left-0 h-full w-full max-w-[380px] bg-neutral-950 border-r border-neutral-900 shadow-2xl z-50 transition-transform duration-350 ease-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header section */}
        <div className="flex items-center justify-between px-5 py-4 bg-neutral-900 border-b border-neutral-850">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-cyan-400 animate-spin-slow" />
            <h3 className="text-sm font-semibold tracking-wide font-mono uppercase text-neutral-300">
              Rule Configurator
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Rule Toggles Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-[10px] text-neutral-500 font-mono leading-relaxed mb-1 border-b border-neutral-900 pb-2">
            Disable or enable specific diagnostic rule engines dynamically. Deselected rules are completely bypassed in AST checks.
          </div>

          <div className="space-y-2.5">
            {RULE_INFO.map((rule) => {
              const isEnabled = ruleToggles[rule.id] ?? false;
              return (
                <div 
                  key={rule.id}
                  onClick={() => toggleRule(rule.id)}
                  className={`flex items-start justify-between gap-4 border rounded-lg p-3 cursor-pointer group transition-all select-none ${isEnabled ? 'bg-neutral-900/25 border-neutral-850 hover:border-neutral-750' : 'bg-neutral-950 border-neutral-950 opacity-50 hover:opacity-75'}`}
                >
                  {/* Rule details */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5">{rule.icon}</div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-mono font-bold text-neutral-200 truncate pr-2">
                        {rule.name}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono leading-normal">
                        {rule.description}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] font-mono font-bold tracking-wider uppercase text-neutral-500">
                          {rule.category}
                        </span>
                        <span className="text-[8px] font-mono px-1 border border-neutral-800 bg-neutral-900/60 rounded text-neutral-400">
                          {rule.severity}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle switch icon */}
                  <button className="text-neutral-500 hover:text-neutral-300 transition-all focus:outline-none">
                    {isEnabled ? (
                      <ToggleRight size={22} className="text-cyan-400" />
                    ) : (
                      <ToggleLeft size={22} className="text-neutral-700" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Footer info panel */}
        <div className="px-5 py-3.5 bg-neutral-900 border-t border-neutral-850 text-[10px] font-mono text-neutral-500 flex items-center justify-between">
          <span>Active Rules: {Object.values(ruleToggles).filter(Boolean).length} / 9</span>
          <span>Engine Hot-Reloads</span>
        </div>
      </div>
    </>
  );
};
