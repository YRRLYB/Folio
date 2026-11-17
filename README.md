# Folio

**为独立开发者与创作者准备的博客与作品集框架。**

Folio 把前台展示和内容管理放在同一个项目里。内置的 **Studio** 工作台可以直接在浏览器里写文章、陈列作品、整理个人链接，还能调整站点外观和首页排布，不用每次都改代码。

![Folio 首页预览](docs/preview.png)

## 特性

### 内容创作与管理

- **Studio 工作台**：文章、项目和独立页面都在后台统一管理，不用再维护本地文件
- **富文本编辑**：基于 Tiptap，支持插入图片、画廊、提示框、时间线和跳转按钮
- **元数据**：可设置封面、摘要、分类和标签，支持草稿箱和历史版本
- **媒体库**：在后台直接上传、预览和管理图片与视频

### 外观定制

- **主题**：支持浅色和深色模式，也可以跟随访客的系统设置自动切换
- **界面微调**：可配置站点资料、品牌强调色、字体、全局圆角和动态背景
- **首页编排**：预设区块的标题、描述、配图、跳转链接和显示状态可单独调整，中间区块支持排序
- **响应式**：适配桌面、平板和手机

### 互动与连接

- **评论审核**：访客评论需要站长在后台审核通过后才会公开
- **浏览统计**：展示文章的大致阅读热度，同一标签页内短时间重复访问不会重复计数
- **个人名片与传送门**：集中展示社交账号、友情链接和二维码
- **GitHub 动态**：展示公开仓库动态和贡献记录

## 技术栈

- **框架：** Next.js、React、TypeScript
- **数据：** PostgreSQL、Drizzle ORM
- **编辑器：** Tiptap
- **认证：** Better Auth
- **样式：** CSS、Tailwind CSS

## 快速开始

### 环境要求

- Node.js 20.9 或更高版本（推荐 Node.js 22）
- PostgreSQL 数据库

### 1. 获取项目

点击 GitHub 仓库右上角的 **Use this template** 创建你自己的仓库，或者直接克隆到本地：

```bash
git clone https://github.com/YRRLYB/Folio.git
cd Folio
npm ci
```

### 2. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

Windows PowerShell 用户请运行：

```powershell
Copy-Item .env.example .env
```

然后编辑 `.env`，填入数据库连接和站长账号信息：

```env
DATABASE_URL=postgres://用户名:密码@localhost:5432/数据库名

BETTER_AUTH_SECRET=替换为随机生成的密钥
BETTER_AUTH_URL=http://localhost:3000

OWNER_EMAIL=you@example.com
OWNER_PASSWORD=设置一个至少12位的密码

NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 可选：用于获取 GitHub 贡献数据
GITHUB_TOKEN=
```

`BETTER_AUTH_SECRET` 至少需要 32 个字符，可以用下面的命令生成：

```bash
openssl rand -base64 32
```

### 3. 初始化数据库

```bash
npm run db:migrate
npm run db:seed
npm run owner:create
```

- `db:seed`：写入默认配置、一篇示例文章和一个示例项目，登录 Studio 后可以随时编辑或删除。
- `owner:create`：创建站长账号，只需在首次部署时运行一次。

### 4. 启动开发服务器

```bash
npm run dev
```

启动后可以访问：

- **公开站点：** <http://localhost:3000>
- **Studio 登录页：** <http://localhost:3000/studio/login>

使用 `.env` 中配置的站长邮箱和密码登录即可。

## 使用 Studio

登录后，可以在 Studio 中管理全站的内容和外观：

| 模块 | 功能 |
| --- | --- |
| **文章** | 撰写、发布和管理博客文章 |
| **项目** | 展示个人作品、项目详情和相关链接 |
| **页面** | 创建和编辑独立页面 |
| **媒体** | 上传和管理图片、视频等资源 |
| **评论** | 审核、撤回或删除访客留言 |
| **首页** | 调整预设区块的内容、显示状态和顺序 |
| **外观** | 配置站点资料、主题配色、字体和背景 |
| **导航与社交** | 管理顶部导航、社交账号和传送门链接 |

> **关于首页编排：** 首页由一组预设区块组成。首屏固定在顶部，传送门位于最后一屏，页脚固定在底部，其余区块可以隐藏或调整顺序。暂不支持自由拖拽排版，也不能新增自定义区块类型。

## 评论审核与浏览统计

- **评论审核**：访客提交的评论默认处于待审核状态，不会立即公开。站长可以在 Studio 的「评论」模块中通过、撤回或删除。
- **浏览统计**：用来反映文章的大致阅读热度。同一浏览器标签页在 30 分钟内重复访问同一篇文章只计一次，因此这个数值不等于独立访客数（UV）。

## 生产部署

Folio 需要一个持续运行的 Node.js 服务和一个 PostgreSQL 数据库。

1. 准备好生产环境的 PostgreSQL，并配置好对应的环境变量。
2. 将 `BETTER_AUTH_URL` 和 `NEXT_PUBLIC_SITE_URL` 改为实际绑定的线上域名。
3. 执行数据库迁移，构建并启动：

```bash
npm ci
npm run db:migrate
npm run build
npm run start
```

首次部署到空数据库时，请参照「快速开始」运行 `npm run db:seed` 和 `npm run owner:create`。

建议在应用前面架设 Nginx 或 Caddy 等反向代理来启用 HTTPS，并定期备份 PostgreSQL。Studio 新上传的媒体文件存放在数据库中，备份数据库时也会一并保存。旧版 `/uploads/` 文件如尚未回填到数据库，还需要单独备份。

## 常用命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器

npm run typecheck    # 检查 TypeScript 类型
npm run lint         # 运行代码规范检查

npm run db:migrate   # 执行数据库迁移
npm run db:seed      # 写入默认配置与示例内容
npm run db:studio    # 打开 Drizzle Studio 管理数据库
npm run owner:create # 创建站长账号（仅首次部署需要）
```

## 项目结构

```text
src/
├── app/           # 页面路由、布局和服务端 API
├── components/
│   ├── site/      # 公开站点的前台组件
│   └── studio/    # Studio 工作台组件
├── db/            # 数据库 Schema 和迁移文件
└── lib/           # 默认配置、工具函数和核心业务逻辑

public/            # 默认头像等静态资源
scripts/           # 数据库初始化与运维脚本
docs/              # 预览图和说明文档
```

## 许可证

本项目基于 [Apache License 2.0](LICENSE) 开源。
