"use client";

import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { ContributionGraph } from "@/components/site/ContributionGraph";
import type { GithubData } from "@/lib/types";
import { studioRequest } from "./client";
import styles from "./studio.module.css";
import githubStyles from "./github-workspace.module.css";

export function GithubWorkspacePanel({ username, savedUsername, onChange }: { username: string; savedUsername: string; onChange: (username: string) => void }) {
  const [preview, setPreview] = useState<{ username: string; refreshKey: number; data: GithubData | null; error: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!savedUsername) return;
    let active = true;
    studioRequest<GithubData | null>("github").then((result) => {
      if (active) setPreview({ username: savedUsername, refreshKey, data: result, error: "" });
    }).catch((caught) => {
      if (active) setPreview({ username: savedUsername, refreshKey, data: null, error: caught instanceof Error ? caught.message : "GitHub 数据加载失败" });
    });
    return () => { active = false; };
  }, [savedUsername, refreshKey]);

  const loaded = Boolean(preview && preview.username === savedUsername && preview.refreshKey === refreshKey);
  const loading = Boolean(savedUsername) && !loaded;
  const data = loaded ? preview?.data : null;
  const error = loaded ? preview?.error : "";
  const refresh = () => setRefreshKey((value) => value + 1);
  const profileUrl = savedUsername ? `https://github.com/${encodeURIComponent(savedUsername)}` : "";
  const graphReady = Boolean(data?.contributions.length);

  return <div className={githubStyles.layout}>
    <div className={styles.githubSettings}>
      <div className={styles.panelLabel}>公开 GitHub 账号</div>
      <p>用户名将同步到首页 GitHub 区块和独立动态页。</p>
      <label className={styles.fieldLabel}>GitHub 用户名<input className={styles.field} value={username} placeholder="例如 octocat" onChange={(event) => onChange(event.target.value)} /></label>
      <div className={styles.githubExample}><span>公开主页</span>{username ? <a href={`https://github.com/${encodeURIComponent(username)}`} target="_blank" rel="noopener noreferrer">github.com/{username} <ExternalLink size={15} /></a> : <span>填写用户名后显示</span>}</div>
      <div className={styles.githubTip}><span>贡献图从 GitHub 获取公开记录。可在服务器环境中设置 GITHUB_TOKEN 来使用官方 GraphQL API；令牌无需填写到站点设置。</span></div>
    </div>
    <section className={githubStyles.preview} aria-label="GitHub 数据预览">
      <div className={githubStyles.previewHeader}><div><span className={styles.panelLabel}>数据预览</span><p>当前已保存账号的数据</p></div><button type="button" className={githubStyles.refreshButton} onClick={refresh} disabled={loading || !savedUsername} title="刷新 GitHub 数据" aria-label="刷新 GitHub 数据"><RefreshCw size={16} /></button></div>
      {username !== savedUsername && <p className={githubStyles.pending}>保存更改后更新预览。</p>}
      {!savedUsername ? <p className={githubStyles.empty}>保存 GitHub 用户名后，这里会显示公开贡献记录。</p> : loading && !data ? <p className={githubStyles.empty}>正在读取 GitHub 数据…</p> : error ? <p className={githubStyles.error} role="alert">{error}</p> : <>
        <div className={githubStyles.account}><div><strong>{data?.profile?.name || savedUsername}</strong><span>@{savedUsername}</span></div>{profileUrl && <a href={profileUrl} target="_blank" rel="noopener noreferrer">打开 GitHub <ExternalLink size={14} /></a>}</div>
        <p className={githubStyles.status}>{graphReady && data ? `贡献日历已载入 · ${data.contributionSource === "graphql" ? "GitHub API" : "GitHub 公开页面"}` : data?.profile ? "公开资料已载入，贡献日历暂不可用" : "公开资料暂不可用"}</p>
        {graphReady && data ? <ContributionGraph contributions={data.contributions} total={data.contributionTotal} /> : null}
        {data?.profile ? <div className={githubStyles.facts}><span>{data.profile.publicRepos} 个公开仓库</span><span>{data.profile.followers} 位关注者</span><span>{data.events.length} 条近期活动</span></div> : null}
      </>}
    </section>
  </div>;
}
