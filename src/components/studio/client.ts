export async function studioRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/studio/${path}`, {
    credentials: "same-origin",
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string; details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } } | null;
    const field = Object.entries(body?.details?.fieldErrors ?? {}).find(([, messages]) => messages?.length);
    if (field) {
      const labels: Record<string, string> = { title: "标题", slug: "链接标识", content: "正文内容", coverImage: "封面图片", projectStatus: "项目状态", projectDate: "项目日期", githubUrl: "GitHub URL", demoUrl: "项目入口地址", tags: "标签", techStack: "技术栈", readingMinutes: "预计阅读时间" };
      const reason = field[1][0] === "Invalid input" ? "格式不正确" : field[1][0] === "Invalid URL" ? "链接格式不正确" : field[1][0];
      throw new Error(`${labels[field[0]] ?? field[0]}：${reason}`);
    }
    throw new Error(body?.details?.formErrors?.[0] ?? body?.error ?? `请求失败 (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function jsonRequest(method: "POST" | "PATCH" | "PUT", body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

export function readableDate(value?: string | null): string {
  if (!value) return "尚未发布";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" }).format(date);
}
