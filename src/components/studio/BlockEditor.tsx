"use client";

import { useState } from "react";
import { Node, mergeAttributes, type JSONContent } from "@tiptap/core";
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, type NodeViewProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { ArrowUpRight, Bold, Code2, GripVertical, Heading1, Heading2, ImagePlus, Italic, Link2, List, ListOrdered, Plus, Quote, Redo2, Trash2, Undo2 } from "lucide-react";
import type { MediaAsset } from "@/lib/types";
import { safeSiteUrl } from "@/lib/site-url";
import { SiteTransferButton } from "@/components/site/SiteTransferButton";
import { TransferButtonNode, type TransferButtonAttributes } from "./TransferButtonNode";
import styles from "./studio.module.css";
import transferStyles from "./transfer-button-editor.module.css";

export type EditorValue = JSONContent | string | null | undefined;

const extraBlocks = [
  { kind: "gallery", label: "图片画廊", hint: "用逗号分隔图片 URL", field: "图片 URL" },
  { kind: "video", label: "视频", hint: "视频文件或嵌入链接", field: "视频 URL" },
  { kind: "music", label: "音乐", hint: "音频文件或播放链接", field: "音频 URL" },
  { kind: "notice", label: "提示", hint: "突出显示一段信息", field: "提示文字" },
  { kind: "timeline", label: "时间线", hint: "记录一个时间节点", field: "日期或年份" },
  { kind: "project", label: "项目引用", hint: "输入项目 slug", field: "项目 slug" },
  { kind: "github", label: "GitHub 仓库", hint: "输入 owner/repo", field: "owner/repo" },
  { kind: "custom", label: "自定义组件", hint: "输入组件名称或标识", field: "组件名称" },
] as const;

function BlockView({ node, updateAttributes, selected }: NodeViewProps) {
  const { kind, value, detail } = node.attrs as { kind: string; value: string; detail: string };
  const block = extraBlocks.find((item) => item.kind === kind);
  return (
    <NodeViewWrapper className={[styles.customBlock, selected ? styles.customBlockSelected : ""].join(" ")}>
      <div className={styles.customBlockHeader}><span>{block?.label ?? "自定义区块"}</span><span>{block?.hint}</span></div>
      <input className={styles.blockInput} aria-label={block?.field ?? "区块内容"} placeholder={block?.field ?? "内容"} value={value ?? ""} onChange={(event) => updateAttributes({ value: event.target.value })} />
      <input className={styles.blockInput} aria-label="区块说明" placeholder="说明（可选）" value={detail ?? ""} onChange={(event) => updateAttributes({ detail: event.target.value })} />
    </NodeViewWrapper>
  );
}

const CustomBlock = Node.create({
  name: "customBlock",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      kind: { default: "notice" },
      value: { default: "" },
      detail: { default: "" },
    };
  },
  parseHTML() { return [{ tag: "div[data-site-block]", getAttrs: (element) => ({ kind: (element as HTMLElement).dataset.siteBlock, value: (element as HTMLElement).dataset.value, detail: (element as HTMLElement).dataset.detail }) }]; },
  renderHTML({ HTMLAttributes }) { return ["div", mergeAttributes(HTMLAttributes, { "data-site-block": HTMLAttributes.kind, "data-value": HTMLAttributes.value, "data-detail": HTMLAttributes.detail })]; },
  addNodeView() { return ReactNodeViewRenderer(BlockView); },
});

function TransferButtonView({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  const { label, href, variant } = node.attrs as TransferButtonAttributes;
  const validHref = safeSiteUrl(href);
  return (
    <NodeViewWrapper className={[transferStyles.block, selected ? transferStyles.selected : ""].join(" ")} contentEditable={false}>
      <div className={transferStyles.header}>
        <span className={transferStyles.dragHandle} data-drag-handle title="拖动调整位置"><GripVertical size={15} /></span>
        <ArrowUpRight size={15} /><span>传送按钮</span>
        <button type="button" className={transferStyles.remove} aria-label="删除传送按钮" title="删除传送按钮" onClick={deleteNode}><Trash2 size={14} /></button>
      </div>
      <div className={transferStyles.fields}>
        <label className={transferStyles.field}>按钮文字
          <input aria-label="传送按钮文字" placeholder="例如：进入图库网站" value={label} onChange={(event) => updateAttributes({ label: event.target.value })} />
        </label>
        <label className={transferStyles.field}>按钮样式
          <select aria-label="传送按钮样式" value={variant} onChange={(event) => updateAttributes({ variant: event.target.value })}>
            <option value="primary">实心</option><option value="secondary">描边</option>
          </select>
        </label>
        <label className={[transferStyles.field, transferStyles.address].join(" ")}>跳转地址
          <input aria-label="传送按钮地址" aria-invalid={!validHref} placeholder="https://example.com 或 /pages/about" value={href} onChange={(event) => updateAttributes({ href: event.target.value })} onBlur={(event) => updateAttributes({ href: event.target.value.trim() })} />
          <span className={[transferStyles.hint, !validHref ? transferStyles.error : ""].join(" ")}>{!validHref ? "请输入完整的 http(s) 网址，或以 / 开头的站内路径。" : "支持外部网址，或以 / 开头的站内路径。"}</span>
        </label>
      </div>
      <div className={transferStyles.preview} onClickCapture={(event) => event.preventDefault()}>
        <SiteTransferButton href={validHref ?? "/"} variant={variant}>{label || "前往查看"}</SiteTransferButton>
        <span>按钮预览</span>
      </div>
    </NodeViewWrapper>
  );
}

const TransferButton = TransferButtonNode.extend({
  addNodeView() { return ReactNodeViewRenderer(TransferButtonView); },
});

function initialContent(value: EditorValue): JSONContent | string {
  if (!value) return { type: "doc", content: [{ type: "paragraph" }] };
  if (typeof value !== "string") return value;
  try { return JSON.parse(value) as JSONContent; } catch { return value; }
}

export function BlockEditor({ value, onChange, assets = [] }: { value: EditorValue; onChange: (value: JSONContent) => void; assets?: MediaAsset[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [inputUrl, setInputUrl] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ link: false }), Image, Link.configure({ openOnClick: false, autolink: true }), Placeholder.configure({ placeholder: "开始写作…" }), CustomBlock, TransferButton],
    content: initialContent(value),
    editorProps: { attributes: { class: styles.prose, "aria-label": "正文编辑器" } },
    onUpdate: ({ editor: instance }) => onChange(instance.getJSON()),
  });

  const insert = (kind: string) => {
    if (!editor) return;
    const value = inputUrl.trim();
    if (kind === "image") {
      if (!value) return;
      editor.chain().focus().setImage({ src: value, alt: "" }).run();
    } else if (kind === "link") {
      if (!value) return;
      const text = editor.state.selection.empty ? value : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to);
      editor.chain().focus().insertContent({ type: "text", text, marks: [{ type: "link", attrs: { href: value } }] }).run();
    } else if (kind === "transferButton") {
      editor.chain().focus().insertContent({ type: "transferButton", attrs: { label: "前往查看", href: value || "/", variant: "primary" } }).run();
    } else {
      editor.chain().focus().insertContent({ type: "customBlock", attrs: { kind, value: kind === "notice" ? "提示内容" : value, detail: "" } }).run();
    }
    setInputUrl(""); setAddOpen(false);
  };

  if (!editor) return <div className={styles.editorLoading} aria-label="编辑器准备中" />;
  return (
    <div className={styles.editorFrame}>
      <div className={styles.editorToolbar} role="toolbar" aria-label="文本格式">
        <button type="button" title="粗体" aria-label="粗体" aria-pressed={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={17} /></button>
        <button type="button" title="斜体" aria-label="斜体" aria-pressed={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={17} /></button>
        <span className={styles.toolbarDivider} />
        <button type="button" title="一级标题" aria-label="一级标题" aria-pressed={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={19} /></button>
        <button type="button" title="二级标题" aria-label="二级标题" aria-pressed={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={19} /></button>
        <button type="button" title="无序列表" aria-label="无序列表" aria-pressed={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={17} /></button>
        <button type="button" title="有序列表" aria-label="有序列表" aria-pressed={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={17} /></button>
        <button type="button" title="引用" aria-label="引用" aria-pressed={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={17} /></button>
        <button type="button" title="代码块" aria-label="代码块" aria-pressed={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code2 size={17} /></button>
        <span className={styles.toolbarSpacer} />
        <button type="button" title="撤销" aria-label="撤销" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={17} /></button>
        <button type="button" title="重做" aria-label="重做" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={17} /></button>
        <button type="button" className={styles.addBlockButton} aria-expanded={addOpen} onClick={() => setAddOpen((open) => !open)}><Plus size={16} /> 插入区块</button>
      </div>
      {addOpen && <div className={styles.blockPicker}>
        <div className={styles.blockPickerIntro}><strong>插入内容</strong><span>在光标处添加一个区块</span></div>
        <div className={styles.blockPickerGrid}>
          <button type="button" onClick={() => insert("image")}><ImagePlus size={17} /> 图片</button>
          <button type="button" onClick={() => insert("link")}><Link2 size={17} /> 链接</button>
          <button type="button" onClick={() => insert("transferButton")}><ArrowUpRight size={17} /> 传送按钮</button>
          {extraBlocks.map((block) => <button type="button" key={block.kind} onClick={() => insert(block.kind)}>{block.label}</button>)}
        </div>
        <input className={styles.field} aria-label="区块链接" placeholder="图片、链接或媒体 URL（可选）" value={inputUrl} onChange={(event) => setInputUrl(event.target.value)} />
        {assets.length > 0 && <select className={styles.field} aria-label="从媒体库选取图片" value="" onChange={(event) => setInputUrl(event.target.value)}><option value="">或从媒体库选择图片…</option>{assets.filter((asset) => asset.mimeType.startsWith("image/")).map((asset) => <option value={asset.url} key={asset.id}>{asset.name}</option>)}</select>}
      </div>}
      <EditorContent editor={editor} />
      <div className={styles.editorFooter}>输入 / 开始创作 · 支持拖动自定义区块调整位置</div>
    </div>
  );
}
