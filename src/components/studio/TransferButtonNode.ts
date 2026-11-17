import { Node, mergeAttributes } from "@tiptap/core";
import { safeSiteUrl } from "@/lib/site-url";

export type TransferButtonAttributes = {
  label: string;
  href: string;
  variant: "primary" | "secondary";
};

export const TransferButtonNode = Node.create({
  name: "transferButton",
  priority: 1000,
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      label: {
        default: "前往查看",
        rendered: false,
        parseHTML: (element) => element.getAttribute("data-label") || element.textContent || "前往查看",
      },
      href: {
        default: "/",
        rendered: false,
        parseHTML: (element) => element.getAttribute("data-href") || element.getAttribute("href") || "/",
      },
      variant: {
        default: "primary",
        rendered: false,
        parseHTML: (element) => element.getAttribute("data-variant") === "secondary" ? "secondary" : "primary",
      },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-transfer-button]", priority: 100 }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { label, href, variant } = node.attrs as TransferButtonAttributes;
    return ["a", mergeAttributes(HTMLAttributes, {
      "data-transfer-button": "",
      "data-label": label,
      "data-href": href,
      "data-variant": variant === "secondary" ? "secondary" : "primary",
      href: safeSiteUrl(href) ?? "/",
    }), label || "前往查看"];
  },
});
