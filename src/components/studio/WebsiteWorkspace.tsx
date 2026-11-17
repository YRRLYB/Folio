"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowUp, Check, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { HomeSection, MediaAsset, NavItem, SiteConfig, SocialLink } from "@/lib/types";
import { defaultSiteConfig } from "@/lib/defaults";
import { safeSiteUrl } from "@/lib/site-url";
import { socialTypes } from "@/lib/social";
import { jsonRequest, studioRequest } from "./client";
import { BackgroundSources } from "./BackgroundSources";
import { GithubWorkspacePanel } from "./GithubWorkspacePanel";
import styles from "./studio.module.css";

export type WebsiteSection = "homepage" | "appearance" | "navigation" | "social" | "github";
const sectionLabels: Record<WebsiteSection, { eyebrow: string; title: string; description: string }> = {
  homepage: { eyebrow: "WEBSITE / HOME", title: "首页布局", description: "调整每个区块的内容和顺序，右侧实时查看效果。" },
  appearance: { eyebrow: "WEBSITE / APPEARANCE", title: "站点外观", description: "让这个空间真正属于你，从身份信息到颜色与背景。" },
  navigation: { eyebrow: "WEBSITE / NAVIGATION", title: "导航", description: "管理访客在站点顶部看到的入口。" },
  social: { eyebrow: "WEBSITE / SOCIAL", title: "社交链接", description: "把你的作品、账号和联系方式连接在一起。" },
  github: { eyebrow: "WEBSITE / GITHUB", title: "GitHub", description: "连接你的公开仓库与贡献记录。" },
};
const homeNames: Record<string, string> = { hero: "首屏介绍", about: "关于我", projects: "精选项目", github: "GitHub", posts: "最近文章", portal: "传送门", footer: "页脚" };
const fixedHomeSections = new Set(["hero", "portal", "footer"]);

function sortedHomeSections(homepage: SiteConfig["homepage"]) {
  const position = (key: string) => key === "hero" ? -1 : key === "portal" ? 1 : key === "footer" ? 2 : 0;
  return Object.entries(homepage).sort(([firstKey, first], [secondKey, second]) =>
    position(firstKey) - position(secondKey) || first.order - second.order);
}

function swapOrder<T extends { order: number }>(items: T[], index: number, direction: -1 | 1): T[] {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const next = index + direction;
  if (next < 0 || next >= sorted.length) return sorted;
  [sorted[index], sorted[next]] = [sorted[next], sorted[index]];
  return sorted.map((item, order) => ({ ...item, order }));
}

export function WebsiteWorkspace({ section, onOpenMedia, onDirtyChange }: { section: WebsiteSection; onOpenMedia: () => void; onDirtyChange?: (dirty: boolean) => void }) {
  const [config, setConfig] = useState<SiteConfig>(defaultSiteConfig);
  const [savedConfig, setSavedConfig] = useState<SiteConfig>(defaultSiteConfig);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [selectedHome, setSelectedHome] = useState("hero");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [settings, media] = await Promise.all([studioRequest<SiteConfig>("settings"), studioRequest<MediaAsset[]>("media")]);
      setConfig(settings); setSavedConfig(settings); setAssets(media);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "设置加载失败"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.all([studioRequest<SiteConfig>("settings"), studioRequest<MediaAsset[]>("media")])
      .then(([settings, media]) => { if (active) { setConfig(settings); setSavedConfig(settings); setAssets(media); } })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "设置加载失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => { onDirtyChange?.(JSON.stringify(config) !== JSON.stringify(savedConfig) || saving); }, [config, savedConfig, saving, onDirtyChange]);

  const updateSite = <K extends keyof SiteConfig["site"]>(key: K, value: SiteConfig["site"][K]) => { setConfig((current) => ({ ...current, site: { ...current.site, [key]: value } })); setNotice(""); };
  const updateTheme = <K extends keyof SiteConfig["theme"]>(key: K, value: SiteConfig["theme"][K]) => { setConfig((current) => ({ ...current, theme: { ...current.theme, [key]: value } })); setNotice(""); };
  const updateBackground = <K extends keyof SiteConfig["background"]>(key: K, value: SiteConfig["background"][K]) => { setConfig((current) => ({ ...current, background: { ...current.background, [key]: value } })); setNotice(""); };
  const updateHome = (key: string, patch: Partial<HomeSection>) => { setConfig((current) => ({ ...current, homepage: { ...current.homepage, [key]: { ...current.homepage[key], ...patch } } })); setNotice(""); };
  const updateNav = (id: string, patch: Partial<NavItem>) => { setConfig((current) => ({ ...current, navigation: current.navigation.map((item) => item.id === id ? { ...item, ...patch } : item) })); setNotice(""); };
  const updateSocial = (id: string, patch: Partial<SocialLink>) => { setConfig((current) => ({ ...current, social: current.social.map((item) => item.id === id ? { ...item, ...patch } : item) })); setNotice(""); };
  const applySaved = <K extends keyof SiteConfig>(keys: K[], submitted: SiteConfig, updated: SiteConfig) => {
    setConfig((current) => {
      const next = { ...current };
      for (const key of keys) if (JSON.stringify(current[key]) === JSON.stringify(submitted[key])) next[key] = updated[key];
      return next;
    });
    setSavedConfig((current) => {
      const next = { ...current };
      for (const key of keys) next[key] = updated[key];
      return next;
    });
  };
  const save = async () => {
    const submitted = config;
    setSaving(true); setError(""); setNotice("");
    try {
      if (section === "navigation") {
        const navigation = await studioRequest<NavItem[]>("navigation", jsonRequest("PUT", [...submitted.navigation].sort((a, b) => a.order - b.order).map((item, order) => ({ ...item, order }))));
        applySaved(["navigation"], submitted, { ...submitted, navigation });
      } else if (section === "social") {
        const social = await studioRequest<SocialLink[]>("social", jsonRequest("PUT", [...submitted.social].sort((a, b) => a.order - b.order).map((item, order) => ({ ...item, order }))));
        applySaved(["social"], submitted, { ...submitted, social });
      } else {
        const patch = section === "homepage" ? { homepage: submitted.homepage } : section === "github" ? { github: submitted.github } : { site: submitted.site, theme: submitted.theme, background: submitted.background };
        const updated = await studioRequest<SiteConfig>("settings", jsonRequest("PATCH", patch));
        applySaved(section === "homepage" ? ["homepage"] : section === "github" ? ["github"] : ["site", "theme", "background"], submitted, updated);
      }
      setNotice("设置已保存，公开站点会显示最新内容。");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "保存失败"); }
    finally { setSaving(false); }
  };
  const addNav = () => setConfig((current) => ({ ...current, navigation: [...current.navigation, { id: crypto.randomUUID(), label: "新链接", href: "/", order: Math.max(-1, ...current.navigation.map((item) => item.order)) + 1, visible: true, external: false }] }));
  const addSocial = () => setConfig((current) => ({ ...current, social: [...current.social, { id: crypto.randomUUID(), label: "新链接", url: "https://", kind: "link", order: Math.max(-1, ...current.social.map((item) => item.order)) + 1, visible: true }] }));
  const moveHome = (key: string, direction: -1 | 1) => {
    if (fixedHomeSections.has(key)) return;
    setConfig((current) => {
      const entries = sortedHomeSections(current.homepage).filter(([itemKey]) => !fixedHomeSections.has(itemKey));
      const index = entries.findIndex(([itemKey]) => itemKey === key);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= entries.length) return current;
      [entries[index], entries[next]] = [entries[next], entries[index]];
      const homepage = { ...current.homepage };
      entries.forEach(([itemKey, item], order) => { homepage[itemKey] = { ...item, order: order + 1 }; });
      return { ...current, homepage };
    });
    setNotice("");
  };
  const moveNav = (index: number, direction: -1 | 1) => setConfig((current) => ({ ...current, navigation: swapOrder(current.navigation, index, direction) }));
  const moveSocial = (index: number, direction: -1 | 1) => setConfig((current) => ({ ...current, social: swapOrder(current.social, index, direction) }));
  const sortedHome = sortedHomeSections(config.homepage);
  const movableHome = sortedHome.filter(([key]) => !fixedHomeSections.has(key));
  const currentHome = config.homepage[selectedHome];
  const imageAssets = assets.filter((asset) => asset.mimeType.startsWith("image/"));
  const previewStyle = undefined;

  return <section className={styles.workspace}>
    <div className={styles.sectionHeader}><div><span className={styles.eyebrow}>{sectionLabels[section].eyebrow}</span><h1>{sectionLabels[section].title}</h1><p>{sectionLabels[section].description}</p></div><button type="button" className={styles.primaryButton} disabled={saving || loading} onClick={() => void save()}><Check size={17} /> {saving ? "保存中…" : "保存更改"}</button></div>
    {error && <div className={styles.errorNotice} role="alert">{error} {loading && <button type="button" onClick={() => void load()}>重试</button>}</div>}{notice && <div className={styles.successNotice} role="status">{notice}</div>}
    {loading ? <div className={styles.skeletonRows}><i /><i /><i /></div> : <>
      {section === "homepage" && <div className={[styles.settingsSplit, styles.homeSettingsSplit].join(" ")}>
        <div className={styles.settingsColumn}>
          <div className={styles.panelLabel}>首页区块</div>
          <div className={styles.homeSectionList}>{sortedHome.map(([key, item], index) => <div className={[styles.homeSectionRow, selectedHome === key ? styles.homeSectionSelected : ""].join(" ")} key={key}>
            <button type="button" className={styles.homeSectionSelect} onClick={() => setSelectedHome(key)}><span className={styles.homeSectionNumber}>{String(index + 1).padStart(2, "0")}</span><span><strong>{homeNames[key] ?? key}</strong><small>{item.title || "未设置标题"}</small></span><ChevronRight size={16} /></button>
            <label className={styles.switchTiny} title="显示或隐藏"><input type="checkbox" checked={item.enabled} onChange={(event) => updateHome(key, { enabled: event.target.checked })} /><span /></label>
            {fixedHomeSections.has(key) ? <span className={styles.reorderSpacer} aria-hidden="true" /> : <div className={styles.reorderButtons}><button type="button" disabled={key === movableHome[0]?.[0]} title="上移" aria-label={"上移" + (homeNames[key] ?? key)} onClick={() => moveHome(key, -1)}><ArrowUp size={14} /></button><button type="button" disabled={key === movableHome[movableHome.length - 1]?.[0]} title="下移" aria-label={"下移" + (homeNames[key] ?? key)} onClick={() => moveHome(key, 1)}><ArrowDown size={14} /></button></div>}
          </div>)}</div>
          {currentHome && <div className={styles.sectionDetails}>
            <div className={styles.panelLabel}>编辑 {homeNames[selectedHome] ?? selectedHome}</div>
            <label className={styles.fieldLabel}>区块标题<input className={styles.field} value={currentHome.title} onChange={(event) => updateHome(selectedHome, { title: event.target.value })} /></label>
            <label className={styles.fieldLabel}>简短描述<textarea className={styles.textarea} rows={3} value={currentHome.description} onChange={(event) => updateHome(selectedHome, { description: event.target.value })} /></label>
            <HomeVisualSettings section={currentHome} assets={imageAssets} defaultMotion={["projects", "github", "posts"].includes(selectedHome) ? "rise" : "none"} onChange={(patch) => updateHome(selectedHome, patch)} />
          </div>}
        </div>
        <div className={styles.previewColumn}><div className={styles.previewToolbar}><span>实时预览</span><div className={styles.deviceSwitch}><button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>桌面</button><button type="button" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>移动</button></div></div><SitePreview config={config} device={device} style={previewStyle} /></div>
      </div>}
      {section === "appearance" && <div className={styles.settingsSplit}><div className={styles.settingsColumn}><div className={styles.settingsGroup}><div className={styles.panelLabel}>个人信息</div><div className={styles.formGrid}><label className={styles.fieldLabel}>站点标题<input className={styles.field} value={config.site.title} onChange={(event) => updateSite("title", event.target.value)} /></label><label className={styles.fieldLabel}>显示名称<input className={styles.field} value={config.site.name} onChange={(event) => updateSite("name", event.target.value)} /></label></div><label className={styles.fieldLabel}>一句话介绍<input className={styles.field} value={config.site.tagline} onChange={(event) => updateSite("tagline", event.target.value)} /></label><label className={styles.fieldLabel}>网站描述<input className={styles.field} value={config.site.description} onChange={(event) => updateSite("description", event.target.value)} /></label><label className={styles.fieldLabel}>个人简介<textarea className={styles.textarea} rows={3} value={config.site.bio} onChange={(event) => updateSite("bio", event.target.value)} /></label><div className={styles.formGrid}><label className={styles.fieldLabel}>当前状态<input className={styles.field} value={config.site.status} onChange={(event) => updateSite("status", event.target.value)} /></label><label className={styles.fieldLabel}>兴趣（逗号分隔）<input className={styles.field} value={config.site.interests.join(", ")} onChange={(event) => updateSite("interests", event.target.value.split(",").map((part) => part.trim()).filter(Boolean))} /></label></div><label className={styles.fieldLabel}>技术方向（逗号分隔）<input className={styles.field} value={config.site.focus.join(", ")} onChange={(event) => updateSite("focus", event.target.value.split(",").map((part) => part.trim()).filter(Boolean))} /></label><div className={styles.avatarRow}><div className={styles.avatarPreview} style={{ borderRadius: config.site.avatarShape === "circle" ? "50%" : config.site.avatarShape === "square" ? "0" : "16px" }}>{config.site.avatar && <img src={config.site.avatar} alt="头像预览" />}</div><div><label className={styles.fieldLabel}>头像 URL<input className={styles.field} value={config.site.avatar} placeholder="/uploads/… 或 https://…" onChange={(event) => updateSite("avatar", event.target.value)} /></label><button type="button" className={styles.textButton} onClick={onOpenMedia}>前往媒体库上传头像 <ChevronRight size={15} /></button></div></div><div className={styles.formGrid}><label className={styles.fieldLabel}>头像形状<select className={styles.field} value={config.site.avatarShape} onChange={(event) => updateSite("avatarShape", event.target.value as SiteConfig["site"]["avatarShape"])}><option value="circle">圆形</option><option value="rounded">圆角</option><option value="square">方形</option></select></label><label className={styles.fieldLabel}>头像尺寸（px）<input className={styles.field} type="number" min="24" max="512" value={config.site.avatarSize} onChange={(event) => updateSite("avatarSize", Number(event.target.value))} /></label></div>{imageAssets.length > 0 && <label className={styles.fieldLabel}>或选择媒体库图片<select className={styles.field} value="" onChange={(event) => { if (event.target.value) updateSite("avatar", event.target.value); }}><option value="">选择图片…</option>{imageAssets.map((asset) => <option value={asset.url} key={asset.id}>{asset.name}</option>)}</select></label>}</div>
      <div className={styles.settingsGroup}><div className={styles.panelLabel}>主题</div><div className={styles.formGrid}><label className={styles.fieldLabel}>强调色<span className={styles.colorField}><input type="color" value={config.theme.accent} onChange={(event) => updateTheme("accent", event.target.value)} /><input className={styles.field} value={config.theme.accent} onChange={(event) => updateTheme("accent", event.target.value)} /></span></label><label className={styles.fieldLabel}>默认主题（访客可切换）<select className={styles.field} value={config.theme.mode} onChange={(event) => updateTheme("mode", event.target.value as SiteConfig["theme"]["mode"])}><option value="light">浅色</option><option value="dark">深色</option><option value="system">跟随系统</option></select></label></div><div className={styles.formGrid}><label className={styles.fieldLabel}>字体<select className={styles.field} value={config.theme.font} onChange={(event) => updateTheme("font", event.target.value)}><option value="sans">现代无衬线</option><option value="serif">衬线</option><option value="mono">等宽</option></select></label><label className={styles.fieldLabel}>圆角（px）<input className={styles.field} type="number" min="0" max="40" value={config.theme.radius} onChange={(event) => updateTheme("radius", Number(event.target.value))} /></label></div></div>
      <div className={styles.settingsGroup}><div className={styles.panelLabel}>背景</div><label className={styles.fieldLabel}>背景来源<select className={styles.field} value={config.background.type} onChange={(event) => updateBackground("type", event.target.value as SiteConfig["background"]["type"])}><option value="none">无背景</option><option value="local">本地媒体</option><option value="url">图片 URL</option><option value="api">API 随机背景</option></select></label>{config.background.type !== "none" && <><label className={styles.fieldLabel}>{config.background.type === "api" ? "API 地址" : config.background.type === "local" ? "本地图片路径" : "图片 URL"}<input className={styles.field} value={config.background.endpoint} placeholder={config.background.type === "local" ? "/uploads/background.jpg" : "https://example.com/image.jpg"} onChange={(event) => updateBackground("endpoint", event.target.value)} /></label>{config.background.type === "local" && imageAssets.length > 0 && <label className={styles.fieldLabel}>选择媒体库图片<select className={styles.field} value="" onChange={(event) => { if (event.target.value) updateBackground("endpoint", event.target.value); }}><option value="">选择图片…</option>{imageAssets.map((asset) => <option value={asset.url} key={asset.id}>{asset.name}</option>)}</select></label>}<div className={styles.formGrid}><label className={styles.fieldLabel}>刷新策略<select className={styles.field} value={config.background.refresh} onChange={(event) => updateBackground("refresh", event.target.value as SiteConfig["background"]["refresh"])}><option value="page">每次打开页面</option><option value="session">每次会话</option><option value="daily">每天</option></select></label><label className={styles.fieldLabel}>模糊强度（px）<input className={styles.field} type="number" min="0" max="64" value={config.background.blur} onChange={(event) => updateBackground("blur", Number(event.target.value))} /></label></div><label className={styles.fieldLabel}>背景透明度：{Math.round(config.background.opacity * 100)}%<input className={styles.rangeInput} type="range" min="0" max="1" step="0.01" value={config.background.opacity} onChange={(event) => updateBackground("opacity", Number(event.target.value))} /></label><label className={styles.switchLine}><span>阅读遮罩<small>让文字在背景上保持清晰</small></span><input type="checkbox" checked={config.background.overlay} onChange={(event) => updateBackground("overlay", event.target.checked)} /></label></>}<BackgroundSources key={JSON.stringify(savedConfig.background)} background={config.background} assets={imageAssets} hasUnsavedBackground={JSON.stringify(config.background) !== JSON.stringify(savedConfig.background)} onActivated={(background) => { setConfig((current) => ({ ...current, background })); setSavedConfig((current) => ({ ...current, background })); }} /></div></div><div className={styles.previewColumn}><div className={styles.previewToolbar}><span>实时预览</span><div className={styles.deviceSwitch}><button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>桌面</button><button type="button" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>移动</button></div></div><SitePreview config={config} device={device} style={previewStyle} /></div></div>}
      {section === "navigation" && <div className={styles.singleSettings}><div className={styles.listHint}><span>显示在公开网站的顶部导航</span><button type="button" className={styles.secondaryButton} onClick={addNav}><Plus size={15} /> 添加入口</button></div><div className={styles.editableList}>{[...config.navigation].sort((a, b) => a.order - b.order).map((item, index) => <div className={styles.editableRow} key={item.id}><span className={styles.sortNumber}>{String(index + 1).padStart(2, "0")}</span><label className={styles.fieldLabel}>名称<input className={styles.field} value={item.label} onChange={(event) => updateNav(item.id, { label: event.target.value })} /></label><label className={styles.fieldLabel}>地址<input className={styles.field} value={item.href} onChange={(event) => updateNav(item.id, { href: event.target.value })} /></label><label className={styles.inlineCheck}><input type="checkbox" checked={item.visible} onChange={(event) => updateNav(item.id, { visible: event.target.checked })} /> 显示</label><label className={styles.inlineCheck}><input type="checkbox" checked={item.external} onChange={(event) => updateNav(item.id, { external: event.target.checked })} /> 新窗口</label><div className={styles.reorderButtons}><button type="button" disabled={index === 0} title="上移" aria-label={"上移" + item.label} onClick={() => moveNav(index, -1)}><ArrowUp size={15} /></button><button type="button" disabled={index === config.navigation.length - 1} title="下移" aria-label={"下移" + item.label} onClick={() => moveNav(index, 1)}><ArrowDown size={15} /></button><button type="button" title="移除" aria-label={"移除" + item.label} onClick={() => setConfig((current) => ({ ...current, navigation: current.navigation.filter((link) => link.id !== item.id) }))}><Trash2 size={15} /></button></div></div>)}</div>{!config.navigation.length && <div className={styles.emptyState}><h2>没有导航入口</h2><p>添加至少一个入口，让访客可以在站点中移动。</p></div>}</div>}
      {section === "social" && <div className={styles.singleSettings}><div className={styles.listHint}><span>社交账号和网站分组显示；填写完整链接或站内媒体路径，邮箱使用 mailto: 地址。QQ、微信二维码可上传到媒体库后填写其路径。</span><button type="button" className={styles.secondaryButton} onClick={addSocial}><Plus size={15} /> 添加链接</button></div><div className={styles.editableList}>{[...config.social].sort((a, b) => a.order - b.order).map((item, index) => <div className={styles.editableRow} key={item.id}><span className={styles.sortNumber}>{String(index + 1).padStart(2, "0")}</span><label className={styles.fieldLabel}>名称<input className={styles.field} value={item.label} onChange={(event) => updateSocial(item.id, { label: event.target.value })} /></label><label className={styles.fieldLabel}>地址<input className={styles.field} value={item.url} placeholder={item.kind === "email" ? "mailto:you@example.com" : "https://… 或 /media/…"} onChange={(event) => updateSocial(item.id, { url: event.target.value })} /></label><label className={styles.fieldLabel}>类型<select className={styles.field} value={item.kind} onChange={(event) => updateSocial(item.id, { kind: event.target.value })}>{!socialTypes.some((type) => type.value === item.kind) && <option value={item.kind}>{item.kind}</option>}{socialTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label><label className={styles.inlineCheck}><input type="checkbox" checked={item.visible} onChange={(event) => updateSocial(item.id, { visible: event.target.checked })} /> 显示</label><div className={styles.reorderButtons}><button type="button" disabled={index === 0} title="上移" aria-label={"上移" + item.label} onClick={() => moveSocial(index, -1)}><ArrowUp size={15} /></button><button type="button" disabled={index === config.social.length - 1} title="下移" aria-label={"下移" + item.label} onClick={() => moveSocial(index, 1)}><ArrowDown size={15} /></button><button type="button" title="移除" aria-label={"移除" + item.label} onClick={() => setConfig((current) => ({ ...current, social: current.social.filter((link) => link.id !== item.id) }))}><Trash2 size={15} /></button></div></div>)}</div>{!config.social.length && <div className={styles.emptyState}><h2>还没有社交链接</h2><p>添加 GitHub、Bilibili 或其他个人主页。</p></div>}</div>}
      {section === "github" && <GithubWorkspacePanel username={config.github.username} savedUsername={savedConfig.github.username} onChange={(username) => { setConfig((current) => ({ ...current, github: { username } })); setNotice(""); }} />}
    </>}
  </section>;
}

function HomeVisualSettings({ section, assets, defaultMotion, onChange }: { section: HomeSection; assets: MediaAsset[]; defaultMotion: NonNullable<HomeSection["motion"]>; onChange: (patch: Partial<HomeSection>) => void }) {
  const image = safeSiteUrl(section.image);
  return <>
    <div className={styles.panelLabel}>图片与背景</div>
    <label className={styles.fieldLabel}>展示图片<input className={styles.field} value={section.image ?? ""} placeholder="/uploads/image.webp 或 https://…" onChange={(event) => onChange({ image: event.target.value })} /></label>
    {assets.length > 0 && <label className={styles.fieldLabel}>从媒体库选择图片<select className={styles.field} value="" onChange={(event) => { if (event.target.value) onChange({ image: event.target.value }); }}><option value="">选择图片…</option>{assets.map((asset) => <option value={asset.url} key={asset.id}>{asset.name}</option>)}</select></label>}
    {image && <img className={styles.coverPreview} src={image} alt="区块图片预览" />}
    <label className={styles.fieldLabel}>背景图片<input className={styles.field} value={section.backgroundImage ?? ""} placeholder="留空则使用站点背景" onChange={(event) => onChange({ backgroundImage: event.target.value })} /></label>
    {assets.length > 0 && <label className={styles.fieldLabel}>从媒体库选择背景<select className={styles.field} value="" onChange={(event) => { if (event.target.value) onChange({ backgroundImage: event.target.value }); }}><option value="">选择背景…</option>{assets.map((asset) => <option value={asset.url} key={asset.id}>{asset.name}</option>)}</select></label>}
    <div className={styles.fieldLabel}>背景颜色<span className={styles.colorField}><input type="color" aria-label="选择区块背景颜色" value={/^#[0-9a-fA-F]{6}$/.test(section.backgroundColor ?? "") ? section.backgroundColor : "#f6f7f5"} onChange={(event) => onChange({ backgroundColor: event.target.value })} /><input className={styles.field} aria-label="区块背景颜色代码" value={section.backgroundColor ?? ""} placeholder="留空则沿用主题" onChange={(event) => onChange({ backgroundColor: event.target.value })} /></span></div>
    <div className={styles.panelLabel}>链接与动效</div>
    <div className={styles.formGrid}><label className={styles.fieldLabel}>链接文字<input className={styles.field} value={section.linkLabel ?? ""} placeholder="留空则使用默认文字" onChange={(event) => onChange({ linkLabel: event.target.value })} /></label><label className={styles.fieldLabel}>动效<select className={styles.field} value={section.motion ?? defaultMotion} onChange={(event) => onChange({ motion: event.target.value as HomeSection["motion"] })}><option value="none">无</option><option value="fade">淡入</option><option value="rise">轻微上移</option></select></label></div>
    <label className={styles.fieldLabel}>链接地址<input className={styles.field} value={section.linkHref ?? ""} placeholder="/projects、https://… 或 mailto:…" onChange={(event) => onChange({ linkHref: event.target.value })} /></label>
  </>;
}

function SitePreview({ config, device, style }: { config: SiteConfig; device: "desktop" | "mobile"; style?: CSSProperties }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(390);
  const [ready, setReady] = useState(false);
  const baseWidth = device === "mobile" ? 390 : 1440;
  const baseHeight = device === "mobile" ? 844 : 777;
  const scale = width / baseWidth;

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    setWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (ready) frame.current?.contentWindow?.postMessage({ type: "studio-preview-config", config }, window.location.origin);
  }, [config, ready]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === frame.current?.contentWindow && event.data?.type === "studio-preview-ready") setReady(true);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);

  return <div ref={viewport} className={[styles.sitePreview, device === "mobile" ? styles.sitePreviewMobile : ""].join(" ")} style={style}>
    <iframe ref={frame} title="网站实时预览" src="/studio/preview" onLoad={() => setReady(true)} style={{ width: baseWidth, height: baseHeight, transform: `scale(${scale})`, transformOrigin: "top left", border: 0 }} />
  </div>;
}
