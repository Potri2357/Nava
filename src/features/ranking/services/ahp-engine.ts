export interface AHPResult {
  weights: Record<string, number>;      // Derived weights (sum = 1)
  consistencyRatio: number;             // CR ≤ 0.1 means valid
  isConsistent: boolean;
  pairwiseMatrix: number[][];           // For transparency / audit
}

export const CRITERIA = [
  'technical_fit',
  'trajectory', 
  'behavioral',
  'domain',
  'platform_activity'
] as const;

// Random Index values (Saaty, 1980) — fixed by matrix size
const RANDOM_INDEX: Record<number, number> = {
  1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12,
  6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49
};

export function computeAHP(pairwiseMatrix: number[][]): AHPResult {
  const n = pairwiseMatrix.length;
  
  // Step 1: Normalize the matrix (column-wise)
  const colSums = Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      colSums[j] += pairwiseMatrix[i][j];
    }
  }
  
  const normalized = pairwiseMatrix.map((row) =>
    row.map((val, j) => val / colSums[j])
  );
  
  // Step 2: Compute priority vector (row averages = weights)
  const weights: number[] = normalized.map(row =>
    row.reduce((sum, val) => sum + val, 0) / n
  );
  
  // Step 3: Consistency check
  const weightedSum = pairwiseMatrix.map(row =>
    row.reduce((sum, val, j) => sum + val * weights[j], 0)
  );
  
  const lambdaMax = weightedSum.reduce(
    (sum, ws, i) => sum + ws / weights[i], 0
  ) / n;
  
  const CI = (lambdaMax - n) / (n - 1);
  const CR = CI / (RANDOM_INDEX[n] || 1); // fallback to 1 if not in lookup
  
  const weightMap: Record<string, number> = {};
  CRITERIA.forEach((c, i) => { weightMap[c] = weights[i]; });
  
  return {
    weights: weightMap,
    consistencyRatio: CR,
    isConsistent: CR <= 0.10,
    pairwiseMatrix,
  };
}
