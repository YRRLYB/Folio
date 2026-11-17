"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import studioStyles from "./studio.module.css";
import styles from "./authentication.module.css";

export function AuthenticationWorkspace() {
  const { data: session } = authClient.useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (newPassword.length < 12) {
      setError("新密码至少需要 12 个字符。");
      return;
    }
    if (newPassword !== confirmation) {
      setError("两次输入的新密码不一致。");
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
      if (result.error) throw new Error(result.error.message || "密码更新失败");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setNotice("密码已更新，其他设备上的登录已失效。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "密码更新失败，请重试。");
    } finally {
      setBusy(false);
    }
  };

  return <section className={studioStyles.workspace}>
    <div className={studioStyles.sectionHeader}>
      <div><span className={studioStyles.eyebrow}>SYSTEM / AUTHENTICATION</span><h1>账户安全</h1></div>
    </div>
    <div className={styles.layout}>
      <div className={styles.account}>
        <ShieldCheck size={22} strokeWidth={1.7} aria-hidden="true" />
        <div><span>当前账户</span><strong>{session?.user.email ?? "正在读取账户…"}</strong></div>
      </div>
      <form className={styles.form} onSubmit={(event) => void submit(event)}>
        <h2><KeyRound size={19} strokeWidth={1.8} aria-hidden="true" /> 修改密码</h2>
        <label className={styles.label}>当前密码<input type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
        <label className={styles.label}>新密码<input type="password" autoComplete="new-password" minLength={12} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
        <label className={styles.label}>确认新密码<input type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {notice && <p className={styles.notice} role="status">{notice}</p>}
        <button className={studioStyles.primaryButton} type="submit" disabled={busy}>{busy ? "正在更新…" : "更新密码"}</button>
      </form>
    </div>
  </section>;
}
