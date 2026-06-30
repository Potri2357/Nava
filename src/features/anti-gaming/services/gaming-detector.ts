export interface GamingAnalysis {
  is_flagged: boolean;
  gaming_score: number; // 0-1
  reasons: string[];
  recommendation: string;
}

const BUZZWORDS = [
  'spearheaded', 'synergized', 'leveraged', 'orchestrated', 
  'catalyzed', 'paradigm shift', 'thought leadership', 'game-changing',
  'revolutionized', 'seamlessly'
];

export function detectGaming(rawResumeText: string): GamingAnalysis {
  const text = rawResumeText.toLowerCase();
  
  let buzzwordCount = 0;
  for (const word of BUZZWORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = text.match(regex);
    if (matches) {
      buzzwordCount += matches.length;
    }
  }

  // Calculate density (buzzwords per 1000 words)
  const wordCount = text.split(/\s+/).length;
  const density = wordCount > 0 ? (buzzwordCount / wordCount) * 1000 : 0;
  
  const reasons: string[] = [];
  let score = 0;

  if (density > 15) {
    score += 0.4;
    reasons.push(`High buzzword density (${density.toFixed(1)} per 1000 words). Highly template-like language.`);
  } else if (density > 8) {
    score += 0.2;
    reasons.push(`Moderate buzzword density detected.`);
  }

  // Structural uniformity heuristic (just an example of text analysis)
  const lines = rawResumeText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const bulletLines = lines.filter(l => l.startsWith('-') || l.startsWith('•'));
  
  if (bulletLines.length > 5) {
    const avgLength = bulletLines.reduce((acc, l) => acc + l.length, 0) / bulletLines.length;
    const variance = bulletLines.reduce((acc, l) => acc + Math.pow(l.length - avgLength, 2), 0) / bulletLines.length;
    
    // Very low variance indicates AI-generated uniformity
    if (variance < 100 && avgLength > 80) {
      score += 0.3;
      reasons.push('Unnatural structural uniformity in bullet points (very low variance in length).');
    }
  }

  const isFlagged = score > 0.6;

  return {
    is_flagged: isFlagged,
    gaming_score: Math.min(score, 1.0),
    reasons,
    recommendation: isFlagged 
      ? 'Review with extra scrutiny — resume shows signs of heavy AI generation or templating.'
      : 'Resume appears natural.',
  };
}
