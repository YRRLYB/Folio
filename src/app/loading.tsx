import styles from "@/components/site/site-entrance.module.css";

export default function Loading() {
  return <main id="main-content" className={styles.overlay} aria-label="页面正在准备">
    <div className={styles.center} role="status">
      <svg className={styles.spark} width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true"><path d="M17 2C17 12 12 17 2 17C12 17 17 22 17 32C17 22 22 17 32 17C22 17 17 12 17 2Z" stroke="currentColor" strokeWidth="1.3" /></svg>
      <p className={styles.name}>Your Blog</p>
      <span className={styles.track} aria-hidden="true"><span /></span>
      <p className={styles.caption}>正在准备画面</p>
    </div>
  </main>;
}
