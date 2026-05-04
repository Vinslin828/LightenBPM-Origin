import { memo, useMemo } from "react";
import { cn } from "@/utils/cn";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import type { Extension } from "@codemirror/state";

export type HighlightCodeLanguage = "javascript" | "json";

type CodeTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  minLines?: number;
  className?: string;
  placeholder?: string;
  language?: HighlightCodeLanguage;
};

// Stable module-level constants — created once, never recreated.
// CodeMirror uses referential equality on extensions; a new array/object
// on every render forces a full editor reconfiguration which is very expensive.
const JS_EXTENSIONS: Extension[] = [javascript()];

const BASIC_SETUP = {
  lineNumbers: true,
  foldGutter: false,
  highlightActiveLine: false,
  autocompletion: true,
  bracketMatching: true,
  closeBrackets: true,
  indentOnInput: true,
} as const;

const EDITOR_CLASS = cn(
  "overflow-hidden rounded-md border border-stroke text-sm",
  "[&_.cm-editor]:bg-gray-2 [&_.cm-gutters]:bg-gray-2 [&_.cm-scroller]:bg-gray-2",
);

// memo() prevents re-rendering when the parent re-renders but props haven't changed.
// This is critical: without it, CodeMirror tears down and rebuilds on every parent render.
const HighlightCodeTextarea = memo(function HighlightCodeTextarea({
  value,
  onChange,
  minLines = 12,
  className,
  placeholder,
  language = "javascript",
}: CodeTextareaProps) {
  const editorHeight = useMemo(() => {
    const lineHeight = 20;
    const verticalPadding = 16;
    return `${minLines * lineHeight + verticalPadding}px`;
  }, [minLines]);

  // Language extensions are stable per language value — only recreated if language prop changes
  const extensions = useMemo<Extension[]>(() => {
    switch (language) {
      case "json":
      case "javascript":
      default:
        return JS_EXTENSIONS;
    }
  }, [language]);

  return (
    <div className={cn("w-full rounded-lg bg-gray-2", className)}>
      <CodeMirror
        value={value}
        onChange={onChange}
        height={editorHeight}
        placeholder={placeholder}
        extensions={extensions}
        basicSetup={BASIC_SETUP}
        className={EDITOR_CLASS}
      />
    </div>
  );
});

export default HighlightCodeTextarea;
