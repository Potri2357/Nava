import { GithubSignals } from '@/features/candidates/types';

export async function fetchGithubSignals(username: string): Promise<GithubSignals | null> {
  if (!username) return null;

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };
    
    if (process.env.GITHUB_PAT) {
      headers['Authorization'] = `token ${process.env.GITHUB_PAT}`;
    }

    const userRes = await fetch(`https://api.github.com/users/${username}`, { headers });
    
    if (!userRes.ok) {
      if (userRes.status === 404) return null;
      throw new Error(`GitHub API Error: ${userRes.statusText}`);
    }

    const userData = await userRes.json();
    
    const reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=100`, { headers });
    let repos = [];
    if (reposRes.ok) {
      repos = await reposRes.json();
    }

    let totalStars = 0;
    const languages: Record<string, number> = {};
    const notableRepos = [];

    for (const repo of repos) {
      totalStars += repo.stargazers_count || 0;
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + (repo.size || 1);
      }
      if (repo.stargazers_count >= 10 || repo.forks_count >= 5) {
        notableRepos.push({
          name: repo.name,
          stars: repo.stargazers_count,
          description: repo.description || '',
        });
      }
    }

    // Sort languages by bytes
    const topLanguages = Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([language, bytes]) => ({ language, bytes }));

    // Very basic activity score heuristic (0-1)
    let activityScore = 0.5;
    if (userData.public_repos > 50) activityScore += 0.2;
    if (totalStars > 100) activityScore += 0.2;
    if (totalStars > 1000) activityScore += 0.1;

    return {
      public_repos: userData.public_repos,
      total_stars: totalStars,
      top_languages: topLanguages,
      contribution_streak_days: 0, // Would require GraphQL or scraping contribution graph
      recent_activity_score: Math.min(activityScore, 1.0),
      notable_repos: notableRepos.slice(0, 5),
      profile_created_at: userData.created_at,
      followers: userData.followers,
    };

  } catch (error) {
    console.error('Error fetching GitHub signals:', error);
    return null;
  }
}
