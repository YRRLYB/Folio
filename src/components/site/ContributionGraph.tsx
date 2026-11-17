import type { GithubData } from "@/lib/types";
import styles from "./contribution-graph.module.css";

export function ContributionGraph({ contributions, total }: { contributions: GithubData["contributions"]; total: number | null }) {
  if (!contributions.length) return <p className={styles.unavailable}>贡献日历暂不可用。可以前往 GitHub 查看最新记录。</p>;

  const values = new Map(contributions.map((day) => [day.date, day]));
  const dates = [...values.keys()].sort();
  const first = new Date(dates[0] + "T00:00:00Z");
  const last = new Date(dates[dates.length - 1] + "T00:00:00Z");
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime()) || last.getTime() - first.getTime() > 400 * 86400000) {
    return <p className={styles.unavailable}>贡献日历暂不可用。可以前往 GitHub 查看最新记录。</p>;
  }

  const start = new Date(first);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const days: { date: string; entry: GithubData["contributions"][number] | undefined; padding: boolean }[] = [];
  for (let current = new Date(start); current <= last; current.setUTCDate(current.getUTCDate() + 1)) {
    const date = current.toISOString().slice(0, 10);
    days.push({ date, entry: values.get(date), padding: current < first });
  }
  const weeks = Math.ceil(days.length / 7);
  const months = days.flatMap(({ date, padding }, index) => !padding && date.endsWith("-01")
    ? [{ label: new Intl.DateTimeFormat("zh-CN", { month: "short", timeZone: "UTC" }).format(new Date(date + "T00:00:00Z")), week: Math.floor(index / 7) + 1 }]
    : []);

  return (
    <div className={styles.root}>
      {total !== null ? <p className={styles.summary}>过去一年 <strong>{total.toLocaleString("zh-CN")}</strong> 次公开贡献</p> : null}
      <div className={styles.scroll} role="img" aria-label={total !== null ? `过去一年 ${total} 次公开贡献的 GitHub 活跃日历` : "过去一年的 GitHub 活跃日历"}>
        <div className={styles.canvas}>
          <div className={styles.months} style={{ gridTemplateColumns: `repeat(${weeks}, var(--graph-cell))` }} aria-hidden="true">
            {months.map(({ label, week }) => <span key={week} style={{ gridColumn: `${week} / span 2` }}>{label}</span>)}
          </div>
          <div className={styles.body}>
            <div className={styles.weekdays} aria-hidden="true"><span /><span>一</span><span /><span>三</span><span /><span>五</span><span /></div>
            <div className={styles.grid} aria-hidden="true">
              {days.map(({ date, entry, padding }) => <span key={date} className={`${styles.cell} ${padding ? styles.padding : !entry ? styles.missing : ""}`} data-level={entry?.level} title={padding ? undefined : entry ? `${date} · ${entry.count} 次贡献` : `${date} · 数据暂不可用`} />)}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.legend}><span>较少</span>{[0, 1, 2, 3, 4].map((level) => <span key={level} className={styles.cell} data-level={level} />)}<span>较多</span></div>
    </div>
  );
}
