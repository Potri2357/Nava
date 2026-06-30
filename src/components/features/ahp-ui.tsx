'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { computeAHP, CRITERIA } from '@/features/ranking/services/ahp-engine';

export function AHPPairwiseUI({ onWeightsDerived }: { onWeightsDerived: (weights: Record<string, number>) => void }) {
  const [mode, setMode] = useState<'quick' | 'expert'>('expert');
  const n = CRITERIA.length;
  const numPairs = (n * (n - 1)) / 2;
  
  // Array to hold judgments. 1 = equal. >1 favors left, <1 favors right
  const [judgments, setJudgments] = useState<number[]>(Array(numPairs).fill(1));
  const [ahpResult, setAhpResult] = useState<ReturnType<typeof computeAHP> | null>(null);
  const [quickWeights, setQuickWeights] = useState<Record<string, number>>({
    technical_fit: 0.35,
    trajectory: 0.25,
    behavioral: 0.2,
    domain: 0.15,
    platform_activity: 0.05,
  });

  // Generate pairs
  const pairs = [];
  let index = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      pairs.push({ index: index++, left: CRITERIA[i], right: CRITERIA[j] });
    }
  }

  const handleSliderChange = (pairIndex: number, value: number[]) => {
    const newJudgments = [...judgments];
    // Map slider (-8 to 8) to Saaty scale (1/9 to 9)
    // 0 = 1, >0 = val+1, <0 = 1/(-val+1)
    const v = value[0];
    let saaty = 1;
    if (v > 0) saaty = v + 1;
    if (v < 0) saaty = 1 / (-v + 1);
    
    newJudgments[pairIndex] = saaty;
    setJudgments(newJudgments);
    calculateAHP(newJudgments);
  };

  const calculateAHP = (currentJudgments: number[]) => {
    const matrix = Array(n).fill(0).map(() => Array(n).fill(1));
    let idx = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const val = currentJudgments[idx++];
        matrix[i][j] = val;
        matrix[j][i] = 1 / val;
      }
    }
    const result = computeAHP(matrix);
    setAhpResult(result);
  };

  const formatCriterionName = (name: string) => name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const updateQuickWeight = (key: string, value: number) => {
    const next = { ...quickWeights, [key]: value };
    const total = Object.values(next).reduce((sum, weight) => sum + weight, 0) || 1;
    setQuickWeights(Object.fromEntries(Object.entries(next).map(([k, v]) => [k, v / total])));
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Scoring Priorities</CardTitle>
            <CardDescription>Define how candidates should be ranked</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setMode(mode === 'quick' ? 'expert' : 'quick')}>
            {mode === 'quick' ? 'Switch to Expert (AHP)' : 'Switch to Quick Mode'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {mode === 'expert' ? (
          <div className="space-y-8">
            <div className="text-sm text-muted-foreground mb-4">
              Compare each pair — which matters more for this role?
            </div>
            {pairs.map((p) => {
              // Convert saaty back to slider
              const saaty = judgments[p.index];
              let sVal = 0;
              if (saaty > 1) sVal = saaty - 1;
              if (saaty < 1) sVal = -(1/saaty - 1);

              return (
                <div key={p.index} className="space-y-3">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="w-1/3 text-left">{formatCriterionName(p.left)}</span>
                    <span className="w-1/3 text-center text-muted-foreground text-xs">vs</span>
                    <span className="w-1/3 text-right">{formatCriterionName(p.right)}</span>
                  </div>
                  <Slider 
                    defaultValue={[0]} 
                    value={[sVal]}
                    max={8} 
                    min={-8} 
                    step={1} 
                    onValueChange={(v) => handleSliderChange(p.index, v as number[])}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground px-1">
                    <span>Strongly favor left</span>
                    <span>Equal</span>
                    <span>Strongly favor right</span>
                  </div>
                </div>
              );
            })}

            {ahpResult && (
              <div className="mt-8 p-4 bg-muted rounded-lg border">
                <h4 className="font-semibold mb-3">Derived Weights</h4>
                <div className="space-y-2">
                  {Object.entries(ahpResult.weights).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2">
                      <div className="w-32 text-sm">{formatCriterionName(k)}</div>
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${v * 100}%` }} />
                      </div>
                      <div className="w-10 text-right text-sm font-medium">{(v * 100).toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <span className="text-sm font-medium">Consistency Ratio:</span>
                  <span className={`text-sm font-bold ${ahpResult.isConsistent ? 'text-green-600' : 'text-red-500'}`}>
                    {ahpResult.consistencyRatio.toFixed(2)} 
                    {ahpResult.isConsistent ? ' ✅ (Valid)' : ' ⚠️ (Review comparisons)'}
                  </span>
                </div>
                <Button 
                  className="w-full mt-4" 
                  disabled={!ahpResult.isConsistent}
                  onClick={() => onWeightsDerived(ahpResult.weights)}
                >
                  Apply These Weights
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Quickly adjust weights using sliders. (Final ranking still uses TOPSIS).
            </div>
            {CRITERIA.map((criterion) => (
              <div key={criterion} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{formatCriterionName(criterion)}</span>
                  <span className="font-medium">{((quickWeights[criterion] ?? 0) * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[Math.round((quickWeights[criterion] ?? 0) * 100)]}
                  max={60}
                  min={0}
                  step={5}
                  onValueChange={(value) => updateQuickWeight(criterion, (Array.isArray(value) ? value[0] : value) / 100)}
                />
              </div>
            ))}
            <Button onClick={() => onWeightsDerived(quickWeights)}>
              Apply Quick Weights
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
