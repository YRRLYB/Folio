"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { studioRequest } from "@/components/studio/client";
import styles from "@/components/studio/studio.module.css";

const subscribeToLocation = () => () => {};

function signInErrorMessage(error: { code?: string; message?: string }) {
  const credentialError = /INVALID_(EMAIL_OR_PASSWORD|PASSWORD|CREDENTIALS)|USER_NOT_FOUND/i.test(error.code ?? "")
    || /invalid email or password|invalid credentials|incorrect password/i.test(error.message ?? "");

  return credentialError
    ? "邮箱或密码不正确，请检查后重试。"
    : error.message || "登录失败，请稍后重试。";
}

export default function StudioLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const setup = useSyncExternalStore(subscribeToLocation, () => new URLSearchParams(window.location.search).has("setup"), () => false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) throw new Error(signInErrorMessage(result.error));
      try { await studioRequest("overview"); }
      catch { await authClient.signOut(); throw new Error("此账号没有 Studio 访问权限，或网站尚未完成配置。"); }
      router.replace("/studio"); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "登录失败，请稍后重试。"); }
    finally { setBusy(false); }
  };
  return (
    <main id="main-content" className={styles.loginShell}>
      <div className={styles.loginTop}>
        <Link className={styles.brand} href="/"><span className={styles.brandMark}>B<span>.</span></span><span className={styles.brandText}><strong>Your Blog</strong><small>Studio</small></span></Link>
        <Link href="/" className={styles.backButton}><ArrowLeft size={16} /> 返回网站</Link>
      </div>
      <div className={styles.loginBody}>
        <div className={styles.loginIntro}>
          <span className={styles.eyebrow}>PERSONAL WORKSPACE</span>
          <h1>欢迎回到<br />你的创作空间<span>.</span></h1>
          <p>登录后继续整理内容、打磨网站，写下下一件值得分享的事。</p>
        </div>
        <form className={styles.loginForm} onSubmit={(event) => void submit(event)}>
          <div className={styles.loginIcon}><LockKeyhole size={23} /></div>
          <h2>登录 Studio</h2>
          <p>使用站点所有者账号继续。</p>
          {setup && <div className={styles.errorNotice} role="status">请先按照 README 配置 DATABASE_URL、BETTER_AUTH_SECRET 和 OWNER_EMAIL，再创建所有者账号。</div>}
          <label className={styles.fieldLabel} htmlFor="studio-email">邮箱</label>
          <input id="studio-email" className={styles.field} type="email" autoComplete="username" required value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="name@example.com" />
          <label className={styles.fieldLabel} htmlFor="studio-password">密码</label>
          <div className={styles.passwordField}>
            <input id="studio-password" className={styles.field} type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="输入密码" />
            <button className={styles.passwordToggle} type="button" aria-label={showPassword ? "隐藏密码" : "显示密码"} aria-pressed={showPassword} title={showPassword ? "隐藏密码" : "显示密码"} onClick={() => setShowPassword((visible) => !visible)}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {error && <div className={styles.errorNotice} role="alert">{error}</div>}
          <button className={styles.primaryButton} type="submit" disabled={busy || setup}>{busy ? "正在登录…" : "进入工作室"} <ArrowRight size={16} /></button>
        </form>
      </div>
      <div className={styles.loginBottom}>Your Blog Studio · Simple by default.</div>
    </main>
  );
}
