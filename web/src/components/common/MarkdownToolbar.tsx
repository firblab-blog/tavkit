import { RefObject } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Link,
  Minus,
} from "lucide-react";

interface MarkdownToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
}

interface ToolbarButton {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action: () => void;
}

export default function MarkdownToolbar({
  textareaRef,
  value,
  onChange,
}: MarkdownToolbarProps) {
  // Insert text at cursor position or wrap selected text
  const insertMarkdown = (
    before: string,
    after: string = "",
    placeholder: string = "",
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToInsert = selectedText || placeholder;

    const newValue =
      value.substring(0, start) +
      before +
      textToInsert +
      after +
      value.substring(end);

    onChange(newValue);

    // Set cursor position after update
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = selectedText
        ? start + before.length + selectedText.length + after.length
        : start + before.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Insert at start of line(s)
  const insertLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Find the start of the current line
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    // Find the end of the selection's last line
    const lineEnd = value.indexOf("\n", end);
    const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;

    // Get all selected lines
    const selectedLines = value.substring(lineStart, actualLineEnd);
    const lines = selectedLines.split("\n");

    // Add prefix to each line
    const prefixedLines = lines.map((line) => prefix + line).join("\n");

    const newValue =
      value.substring(0, lineStart) +
      prefixedLines +
      value.substring(actualLineEnd);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart, lineStart + prefixedLines.length);
    }, 0);
  };

  // Insert numbered list
  const insertNumberedList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEnd = value.indexOf("\n", end);
    const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;

    const selectedLines = value.substring(lineStart, actualLineEnd);
    const lines = selectedLines.split("\n");

    const numberedLines = lines
      .map((line, i) => `${i + 1}. ${line}`)
      .join("\n");

    const newValue =
      value.substring(0, lineStart) +
      numberedLines +
      value.substring(actualLineEnd);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart, lineStart + numberedLines.length);
    }, 0);
  };

  const buttons: ToolbarButton[] = [
    {
      icon: Bold,
      title: "Bold (Ctrl+B)",
      action: () => insertMarkdown("**", "**", "bold text"),
    },
    {
      icon: Italic,
      title: "Italic (Ctrl+I)",
      action: () => insertMarkdown("*", "*", "italic text"),
    },
    {
      icon: Underline,
      title: "Underline",
      action: () => insertMarkdown("<u>", "</u>", "underlined text"),
    },
    {
      icon: Strikethrough,
      title: "Strikethrough",
      action: () => insertMarkdown("~~", "~~", "strikethrough"),
    },
    { icon: Minus, title: "Separator", action: () => {} }, // Visual separator
    {
      icon: Heading1,
      title: "Heading 1",
      action: () => insertLinePrefix("# "),
    },
    {
      icon: Heading2,
      title: "Heading 2",
      action: () => insertLinePrefix("## "),
    },
    {
      icon: Heading3,
      title: "Heading 3",
      action: () => insertLinePrefix("### "),
    },
    { icon: Minus, title: "Separator", action: () => {} },
    {
      icon: List,
      title: "Bullet List",
      action: () => insertLinePrefix("- "),
    },
    {
      icon: ListOrdered,
      title: "Numbered List",
      action: insertNumberedList,
    },
    {
      icon: Quote,
      title: "Quote",
      action: () => insertLinePrefix("> "),
    },
    { icon: Minus, title: "Separator", action: () => {} },
    {
      icon: Code,
      title: "Code",
      action: () => insertMarkdown("`", "`", "code"),
    },
    {
      icon: Link,
      title: "Link",
      action: () => insertMarkdown("[", "](url)", "link text"),
    },
  ];

  return (
    <div className="flex items-center gap-1 p-2 bg-background border border-border border-b-0 rounded-t-lg flex-wrap">
      {buttons.map((button, index) => {
        // Render separator
        if (button.title === "Separator") {
          return (
            <div key={`sep-${index}`} className="w-px h-5 bg-border mx-1" />
          );
        }

        const IconComponent = button.icon;
        return (
          <button
            key={button.title}
            type="button"
            onClick={button.action}
            title={button.title}
            className="p-1.5 rounded hover:bg-primary/20 text-text-muted hover:text-text transition-colors"
          >
            <IconComponent className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}
