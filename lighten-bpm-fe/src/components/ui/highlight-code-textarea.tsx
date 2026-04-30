import { useMemo } from "react";
import { cn } from "@/utils/cn";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";

export type HighlightCodeLanguage = "javascript" | "json";

type CodeTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  minLines?: number;
  className?: string;
  placeholder?: string;
  language?: HighlightCodeLanguage;
};

const getLanguageExtension = (language: HighlightCodeLanguage) => {
  switch (language) {
    case "json":
      return javascript();
    case "javascript":
    default:
      return javascript();
  }
};

export default function HighlightCodeTextarea({
  value,
  onChange,
  minLines = 12,
  className,
  placeholder,
  language = "javascript",
}: CodeTextareaProps) {
  const editorHeight = useMemo(() => {
    const visibleLines = minLines;
    const lineHeight = 20;
    const verticalPadding = 16;
    return `${visibleLines * lineHeight + verticalPadding}px`;
  }, [minLines]);

  return (
    <div className={cn("w-full rounded-lg bg-gray-2", className)}>
      <CodeMirror
        value={value}
        onChange={onChange}
        height={editorHeight}
        placeholder={placeholder}
        extensions={[getLanguageExtension(language)]}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: false,
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          indentOnInput: true,
        }}
        className={cn(
          "overflow-hidden rounded-md border border-stroke text-sm",
          "[&_.cm-editor]:bg-gray-2 [&_.cm-gutters]:bg-gray-2 [&_.cm-scroller]:bg-gray-2",
        )}
      />
    </div>
  );
}
