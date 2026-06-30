export interface TOPSISResult {
  rankings: {
    candidateId: string;
    closenessCoefficient: number;   // 0-1 (higher = better)
    rank: number;
    distanceToIdeal: number;        // d+
    distanceToAntiIdeal: number;    // d-
  }[];
  idealSolution: number[];         // Best possible in each dimension
  antiIdealSolution: number[];     // Worst possible in each dimension
}

export interface CandidateScores {
  candidateId: string;
  dimensions: number[];   // [technical, trajectory, behavioral, domain, platform]
}

export function computeTOPSIS(
  candidates: CandidateScores[],
  weights: number[],               // From AHP (sum = 1)
  criteriaTypes: ('benefit' | 'cost')[]  // All 'benefit' in our case
): TOPSISResult {
  const n = candidates.length;
  const m = weights.length;
  
  if (n === 0) return { rankings: [], idealSolution: [], antiIdealSolution: [] };

  const matrix = candidates.map(c => c.dimensions);
  
  // Vector normalization
  const normalized: number[][] = [];
  for (let i = 0; i < n; i++) {
    normalized[i] = [];
    for (let j = 0; j < m; j++) {
      const colSquareSum = matrix.reduce((sum, row) => sum + row[j] ** 2, 0);
      const denom = Math.sqrt(colSquareSum);
      normalized[i][j] = denom === 0 ? 0 : matrix[i][j] / denom;
    }
  }
  
  // Apply weights
  const weighted = normalized.map(row =>
    row.map((val, j) => val * weights[j])
  );
  
  // Determine Ideal (A+) and Anti-Ideal (A-) solutions
  const ideal: number[] = [];
  const antiIdeal: number[] = [];
  for (let j = 0; j < m; j++) {
    const colValues = weighted.map(row => row[j]);
    if (criteriaTypes[j] === 'benefit') {
      ideal[j] = Math.max(...colValues);
      antiIdeal[j] = Math.min(...colValues);
    } else {
      ideal[j] = Math.min(...colValues);
      antiIdeal[j] = Math.max(...colValues);
    }
  }
  
  // Euclidean distances & Relative closeness
  const rankings = candidates.map((c, i) => {
    const dPlus = Math.sqrt(
      weighted[i].reduce((sum, val, j) => sum + (val - ideal[j]) ** 2, 0)
    );
    const dMinus = Math.sqrt(
      weighted[i].reduce((sum, val, j) => sum + (val - antiIdeal[j]) ** 2, 0)
    );
    
    // Avoid division by zero
    const closeness = (dPlus + dMinus) === 0 ? 0 : dMinus / (dPlus + dMinus);
    
    return {
      candidateId: c.candidateId,
      closenessCoefficient: closeness,
      distanceToIdeal: dPlus,
      distanceToAntiIdeal: dMinus,
      rank: 0,
    };
  });
  
  // Sort and assign ranks
  rankings.sort((a, b) => b.closenessCoefficient - a.closenessCoefficient);
  rankings.forEach((r, i) => { r.rank = i + 1; });
  
  return { rankings, idealSolution: ideal, antiIdealSolution: antiIdeal };
}
