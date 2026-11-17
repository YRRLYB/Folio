import type { Metadata } from "next";
import { connection } from "next/server";
import { getGithubData, getSiteConfig } from "@/lib/server/content";
import { ContributionGraph } from "@/components/site/ContributionGraph";
import { formatDate, SectionHeading } from "@/components/site/ContentList";
import { SiteAvatar } from "@/components/site/SiteAvatar";

export const metadata: Metadata = { title: "GitHub", description: "GitHub 资料与公开活动。" };

const eventLabels: Record<string, string> = {
  PushEvent: "推送了代码",
  CreateEvent: "创建了内容",
  PullRequestEvent: "参与了合并请求",
  IssuesEvent: "参与了议题",
  WatchEvent: "关注了仓库",
  ForkEvent: "派生了仓库",
  ReleaseEvent: "发布了版本",
};

export default async function GithubPage() {
  await connection();
  const config = await getSiteConfig();
  const username = config.github.username;
  const data = username ? await getGithubData(username) : null;
  const profileUrl = data?.profile?.htmlUrl || (username ? "https://github.com/" + encodeURIComponent(username) : "");

  return (
    <div className="site-container">
      <header className="site-page-intro site-page-intro-tight">
        <h1 className="site-page-title">GitHub</h1>
        {data?.profile ? (
          <div className="site-github-profile">
            <SiteAvatar src={data.profile.avatarUrl} name={data.profile.name || username} size={52} />
            <div><strong>{data.profile.name || username}</strong><span>@{username}</span></div>
          </div>
        ) : null}
      </header>
      <div className="site-page-content">
        {data?.profile ? (
          <>
            <div className="site-github-stats">
              <div><strong>{data.profile.publicRepos.toLocaleString("zh-CN")}</strong><span>公开仓库</span></div>
              <div><strong>{data.profile.followers.toLocaleString("zh-CN")}</strong><span>关注者</span></div>
              {data.contributionTotal !== null ? <div><strong>{data.contributionTotal.toLocaleString("zh-CN")}</strong><span>年度贡献</span></div> : null}
            </div>
            {data.profile.bio ? <p className="site-section-description" style={{ marginTop: 28 }}>{data.profile.bio}</p> : null}
            <section className="site-section">
              <SectionHeading title="贡献记录" />
              <ContributionGraph contributions={data.contributions} total={data.contributionTotal} />
            </section>
            <section className="site-section">
              <SectionHeading title="仓库" href={profileUrl} linkText="查看 GitHub" />
              {data.repositories.length ? (
                <div className="site-repo-list">
                  {data.repositories.map((repo) => (
                    <a key={repo.htmlUrl} href={repo.htmlUrl} target="_blank" rel="noopener noreferrer" className="site-repo">
                      <strong>{repo.name}</strong>
                      {repo.description ? <p>{repo.description}</p> : null}
                      <div className="site-repo-meta">
                        {repo.language ? <span>{repo.language}</span> : null}
                        <span>★ {repo.stargazersCount}</span>
                        <span>⑂ {repo.forksCount}</span>
                        <span>更新于 {formatDate(repo.updatedAt)}</span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : <p className="site-empty">这个账号还没有公开仓库。</p>}
            </section>
            {data.events.length ? (
              <section className="site-section">
                <SectionHeading title="最近活动" />
                <div className="site-post-list">
                  {data.events.slice(0, 6).map((event) => (
                    <a key={event.id} href={event.url} target="_blank" rel="noopener noreferrer" className="site-post-row">
                      <time className="site-post-date" dateTime={event.createdAt}>{formatDate(event.createdAt)}</time>
                      <div><h3>{eventLabels[event.type] || event.type}</h3><p>{event.repoName}</p></div>
                      <span className="site-card-arrow" aria-hidden="true">↗</span>
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <div className="site-empty">
            <strong>{username ? "GitHub 数据暂时无法加载。" : "还没有关联 GitHub 账号。"}</strong>
            {profileUrl ? <a className="site-text-link" href={profileUrl} target="_blank" rel="noopener noreferrer">打开公开主页 <span aria-hidden="true">↗</span></a> : null}
          </div>
        )}
      </div>
    </div>
  );
}
