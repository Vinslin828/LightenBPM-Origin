import { useMemo, useRef } from "react";
import { cn } from "@/utils/cn";

type CodeTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  minLines?: number;
  className?: string;
  placeholder?: string;
};

export default function CodeTextarea({
  value,
  onChange,
  minLines = 12,
  className,
  placeholder,
}: CodeTextareaProps) {
  const numbersRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lineCount = useMemo(() => {
    const lines = value ? value.split("\n").length : 1;
    return Math.max(lines, minLines);
  }, [value, minLines]);

  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, index) => index + 1),
    [lineCount],
  );

  const handleScroll = () => {
    if (!numbersRef.current || !textareaRef.current) return;
    numbersRef.current.scrollTop = textareaRef.current.scrollTop;
  };

  return (
    <div
      className={cn(
        "w-full h-60 p-5 bg-gray-2 rounded-lg flex overflow-hidden pb-0",
        className,
      )}
    >
      <div
        ref={numbersRef}
        className="pr-4 text-secondary-text text-xs leading-5 font-mono select-none overflow-hidden"
      >
        {lineNumbers.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        className="flex-1 h-full bg-transparent text-dark text-sm leading-5 font-mono resize-none outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onScroll={handleScroll}
        spellCheck={false}
        placeholder={placeholder}
      />
    </div>
  );
}
