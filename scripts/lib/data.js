// Pulls every number the cards display from the GitHub GraphQL API in one
// place, so no card invents a statistic. Needs a token with `repo` +
// `read:user` to see private contribution totals (aggregates only — never
// repository names or code).
import { langColor } from './theme.js';

const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const LOGIN = process.env.GH_LOGIN || 'salexandr0s';

async function gql(query, variables = {}) {
  if (!TOKEN) throw new Error('GH_TOKEN is not set');
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'salexandr0s-profile-cards',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error('GraphQL: ' + JSON.stringify(json.errors));
  return json.data;
}

const PROFILE = `
query($login:String!){
  user(login:$login){
    login name bio location avatarUrl createdAt
    followers{totalCount}
    contributionsCollection{
      totalCommitContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalIssueContributions
      totalRepositoryContributions
      restrictedContributionsCount
      contributionCalendar{
        totalContributions
        weeks{ contributionDays{ date contributionCount } }
      }
    }
    pullRequests(states:MERGED){totalCount}
  }
}`;

const REPOS = `
query($login:String!,$cursor:String){
  user(login:$login){
    repositories(first:100, after:$cursor, ownerAffiliations:OWNER, isFork:false,
                 orderBy:{field:PUSHED_AT,direction:DESC}){
      pageInfo{ hasNextPage endCursor }
      nodes{
        name description url isPrivate isArchived pushedAt
        stargazerCount forkCount
        primaryLanguage{ name }
        repositoryTopics(first:6){ nodes{ topic{ name } } }
        languages(first:12, orderBy:{field:SIZE,direction:DESC}){
          edges{ size node{ name } }
        }
      }
    }
  }
}`;

/** Longest and current run of days with >=1 contribution. */
function streaks(days) {
  let longest = 0, run = 0, current = 0;
  for (const d of days) {
    if (d.count > 0) { run++; longest = Math.max(longest, run); }
    else run = 0;
  }
  // Walk backwards from today; an empty today does not break a live streak
  // until tomorrow, so skip a single trailing zero.
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) current++;
    else if (i === days.length - 1) continue;
    else break;
  }
  return { current, longest };
}

export async function collect() {
  const [p, repoPages] = await Promise.all([
    gql(PROFILE, { login: LOGIN }),
    (async () => {
      const all = []; let cursor = null;
      for (;;) {
        const d = await gql(REPOS, { login: LOGIN, cursor });
        all.push(...d.user.repositories.nodes);
        if (!d.user.repositories.pageInfo.hasNextPage) break;
        cursor = d.user.repositories.pageInfo.endCursor;
      }
      return all;
    })(),
  ]);

  const u = p.user;
  const c = u.contributionsCollection;

  const days = c.contributionCalendar.weeks
    .flatMap((w) => w.contributionDays)
    .map((d) => ({ date: d.date, count: d.contributionCount }));

  // Language mass across everything owned, public and private.
  const bytes = new Map();
  for (const r of repoPages) {
    if (r.isArchived) continue;
    for (const e of r.languages.edges) {
      bytes.set(e.node.name, (bytes.get(e.node.name) || 0) + e.size);
    }
  }
  const totalBytes = [...bytes.values()].reduce((a, b) => a + b, 0) || 1;
  const languages = [...bytes.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, size]) => ({ name, size, pct: (size / totalBytes) * 100, color: langColor(name) }));

  const stars = repoPages.reduce((a, r) => a + r.stargazerCount, 0);
  const forks = repoPages.reduce((a, r) => a + r.forkCount, 0);

  return {
    login: u.login,
    name: u.name,
    bio: u.bio,
    location: u.location,
    createdAt: u.createdAt,
    followers: u.followers.totalCount,
    totals: {
      contributions: c.contributionCalendar.totalContributions,
      publicCommits: c.totalCommitContributions,
      privateContribs: c.restrictedContributionsCount,
      prs: c.totalPullRequestContributions,
      prsMerged: u.pullRequests.totalCount,
      reviews: c.totalPullRequestReviewContributions,
      issues: c.totalIssueContributions,
      reposStarted: c.totalRepositoryContributions,
      reposOwned: repoPages.length,
      reposPublic: repoPages.filter((r) => !r.isPrivate).length,
      reposPrivate: repoPages.filter((r) => r.isPrivate).length,
      stars, forks,
    },
    streak: streaks(days),
    days,
    languages,
    repos: repoPages,
  };
}
