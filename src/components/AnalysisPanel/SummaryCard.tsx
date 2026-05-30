import React from 'react';
import { AnalysisResult } from '../../engine/types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Award } from 'lucide-react';

interface SummaryCardProps {
  result: AnalysisResult;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ result }) => {
  const { score, summary } = result;

  // Determine grade and styling
  let grade = 'Excellent';
  let badgeColorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let ringColor = '#10b981'; // Emerald
  
  if (score >= 90) {
    grade = 'Excellent';
    badgeColorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    ringColor = '#10b981';
  } else if (score >= 70) {
    grade = 'Good';
    badgeColorClass = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    ringColor = '#06b6d4'; // Cyan
  } else if (score >= 50) {
    grade = 'Needs Work';
    badgeColorClass = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    ringColor = '#eab308'; // Yellow
  } else {
    grade = 'Poor';
    badgeColorClass = 'bg-red-500/10 text-red-400 border-red-500/30';
    ringColor = '#ef4444'; // Red
  }

  // Calculate SVG circular stroke offset
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Get dynamic category scores for Radar
  // Since scoring.ts outputs radarData as an array of { subject, value, fullMark }
  // We can just use result's radarData! Wait! Let's check:
  // Oh, in scoring.ts, calculateScore returns { score, grade, colorClass, summary, radarData, suggestions }
  // But wait, does our AnalysisResult type in types.ts include radarData?
  // Let's check `types.ts`!
  // In `types.ts`, `AnalysisResult` does NOT have `radarData` defined as a first-class property, but wait!
  // In `scoring.ts`, `calculateScore` returns `ScoreBreakdown` which has `radarData`.
  // Wait, did we map `radarData` inside `analyzer.ts` into the returned `AnalysisResult`?
  // Let's check `analyzer.ts`!
  // In `analyzer.ts`, we wrote:
  // `const scoreDetails = calculateScore(allIssues);`
  // `return { score: scoreDetails.score, summary: scoreDetails.summary, issues: allIssues, suggestions: scoreDetails.suggestions, thinkingTrace, refactoredCode: refactoredCode !== code ? refactoredCode : undefined, analyzedAt, codeSnapshot };`
  // Ah! In `analyzer.ts` we did NOT return `radarData` inside the returned `AnalysisResult`!
  // Wait, let's look at `analyzer.ts` output. It returned:
  // `{ score: scoreDetails.score, summary: scoreDetails.summary, issues: allIssues, suggestions: scoreDetails.suggestions, thinkingTrace, ... }`
  // Wait! Let's add `radarData` to the `AnalysisResult` type in `types.ts`, or we can just calculate the radar data on the fly inside the SummaryCard!
  // To avoid any issues, we can just calculate it on the fly or edit `types.ts` and `analyzer.ts` to include it.
  // Actually, calculating it on the fly in `SummaryCard` is extremely easy and decoupling!
  // Let's calculate it in a quick helper:
  const getRadarData = () => {
    let securityDeduction = 0;
    let complexityDeduction = 0;
    let namingDeduction = 0;
    let bestPracticeDeduction = 0;
    let robustnessDeduction = 0;

    result.issues.forEach(i => {
      let weight = 5;
      if (i.severity === 'critical') weight = 20;
      else if (i.severity === 'warning') weight = 10;
      else weight = 2;

      switch (i.ruleId) {
        case 'security':
          securityDeduction += weight;
          break;
        case 'complexity':
          complexityDeduction += weight;
          break;
        case 'naming':
          namingDeduction += weight;
          break;
        case 'bestPractice':
          bestPracticeDeduction += weight;
          break;
        case 'async':
        case 'errorHandling':
        case 'performance':
        case 'nodeSpecific':
          robustnessDeduction += weight;
          break;
      }
    });

    return [
      { subject: 'Security', value: Math.max(20, 100 - securityDeduction), fullMark: 100 },
      { subject: 'Complexity', value: Math.max(20, 100 - complexityDeduction), fullMark: 100 },
      { subject: 'Naming', value: Math.max(20, 100 - namingDeduction), fullMark: 100 },
      { subject: 'Best Practices', value: Math.max(20, 100 - bestPracticeDeduction), fullMark: 100 },
      { subject: 'Robustness & Perf', value: Math.max(20, 100 - robustnessDeduction), fullMark: 100 },
    ];
  };

  const chartData = getRadarData();

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-5 bg-neutral-900/40 rounded-xl border border-neutral-800/80">
      
      {/* Circle Gauge Score */}
      <div className="md:col-span-4 flex flex-col items-center justify-center p-4 border-r border-neutral-800/50">
        <div className="relative w-36 h-36 flex items-center justify-center">
          {/* SVG Progress Circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="72"
              cy="72"
              r={radius}
              className="stroke-neutral-800 fill-none"
              strokeWidth="10"
            />
            <circle
              cx="72"
              cy="72"
              r={radius}
              className="fill-none transition-all duration-1000 ease-out"
              stroke={ringColor}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          {/* Inner Score Label */}
          <div className="absolute flex flex-col items-center justify-center font-mono">
            <span className="text-4xl font-extrabold text-white tracking-tight">{score}</span>
            <span className="text-[10px] text-neutral-500 uppercase font-semibold">Quality Index</span>
          </div>
        </div>

        {/* Grade Badge */}
        <div className="mt-4 flex flex-col items-center">
          <div className={`px-3.5 py-1 text-xs font-mono font-bold tracking-wider uppercase rounded-full border ${badgeColorClass}`}>
            Grade: {grade}
          </div>
          <span className="text-[10px] text-neutral-500 font-mono mt-1">
            {result.issues.length} Issues Flagged
          </span>
        </div>
      </div>

      {/* Summary Text Content */}
      <div className="md:col-span-8 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Award size={18} className="text-cyan-400" />
            <h3 className="text-sm font-semibold tracking-wide font-mono uppercase text-neutral-300">Executive Summary</h3>
          </div>
          <p className="text-sm leading-relaxed text-neutral-400">
            {summary}
          </p>
        </div>

        {/* Radar Analysis */}
        <div className="mt-6 border-t border-neutral-800/60 pt-4 flex flex-col lg:flex-row gap-6 items-center justify-between">
          <div className="flex-1 w-full h-[180px] min-w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                <PolarGrid stroke="#262626" />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: '#737373', fontSize: 9, fontFamily: 'monospace' }} 
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={{ fill: '#404040' }}
                  axisLine={false}
                />
                <Radar
                  name="Metrics"
                  dataKey="value"
                  stroke={ringColor}
                  fill={ringColor}
                  fillOpacity={0.15}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex-1 text-xs font-mono space-y-2 w-full">
            <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold border-b border-neutral-800 pb-1 mb-2">
              Dimensions Health
            </div>
            {chartData.map((d, index) => (
              <div key={index} className="flex justify-between items-center py-0.5">
                <span className="text-neutral-400">{d.subject}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-neutral-800 rounded overflow-hidden">
                    <div 
                      className="h-full rounded" 
                      style={{ 
                        width: `${d.value}%`,
                        backgroundColor: d.value >= 90 ? '#10b981' : d.value >= 70 ? '#06b6d4' : d.value >= 50 ? '#eab308' : '#ef4444'
                      }}
                    ></div>
                  </div>
                  <span className="text-[10px] font-bold text-neutral-300 min-w-[24px] text-right">{d.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
