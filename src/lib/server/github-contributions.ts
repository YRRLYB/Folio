import "server-only";

import { load } from "cheerio";

type Day = { date: string; count: number; level: number };
type Calendar = { days: Day[]; total: number; source: "graphql" | "public" };
type GraphqlResponse = {
  data?: { user?: { contributionsCollection?: { contributionCalendar?: {
    totalContributions: number;
    weeks: { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }[];
  } } } };
};

async function graphqlCalendar(username: string, token: string): Promise<Calendar | null> {
  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}", variables: { login: username } }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const graph = (await response.json() as GraphqlResponse).data?.user?.contributionsCollection?.contributionCalendar;
    if (!graph || !Number.isFinite(graph.totalContributions)) return null;
    const levels: Record<string, number> = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
    const days = graph.weeks.flatMap(({ contributionDays }) => contributionDays.map((day) => ({ date: day.date, count: day.contributionCount, level: levels[day.contributionLevel] ?? 0 })));
    return days.length >= 300 ? { days, total: graph.totalContributions, source: "graphql" } : null;
  } catch {
    return null;
  }
}

async function publicCalendar(username: string): Promise<Calendar | null> {
  try {
    const response = await fetch(`https://github.com/users/${encodeURIComponent(username)}/contributions`, {
      headers: { Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return null;
    const $ = load(await response.text());
    const cells = $("td.ContributionCalendar-day[data-date][data-level]");
    if (cells.length < 300 || cells.length > 400) return null;
    const tooltips = new Map($("tool-tip[for]").toArray().map((element) => [$(element).attr("for"), $(element).text().trim()]));
    const days: Day[] = [];
    let valid = true;
    cells.each((_, element) => {
      const cell = $(element);
      const date = cell.attr("data-date") ?? "";
      const level = Number(cell.attr("data-level"));
      const tooltip = tooltips.get(cell.attr("id")) ?? "";
      const countText = tooltip.match(/^([\d,]+) contributions? on /)?.[1];
      const count = tooltip.startsWith("No contributions on ") ? 0 : countText ? Number(countText.replaceAll(",", "")) : NaN;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(level) || level < 0 || level > 4 || !Number.isInteger(count) || count < 0) {
        valid = false;
        return;
      }
      days.push({ date, level, count });
    });
    if (!valid || days.length !== cells.length || new Set(days.map((day) => day.date)).size !== days.length) return null;
    return { days, total: days.reduce((sum, day) => sum + day.count, 0), source: "public" };
  } catch {
    return null;
  }
}

export async function getGithubContributions(username: string, token?: string): Promise<Calendar | null> {
  return token ? await graphqlCalendar(username, token) ?? await publicCalendar(username) : await publicCalendar(username);
}
