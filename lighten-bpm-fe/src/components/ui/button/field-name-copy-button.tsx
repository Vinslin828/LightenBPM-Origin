import { cn } from "@/utils/cn";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type FieldNameCopyProps = {
  fieldName: string;
};

export default function FieldNameCopy({ fieldName }: FieldNameCopyProps) {
  const [isCopied, setIsCopied] = useState(false);
  const resetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        window.clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      await navigator.clipboard.writeText(fieldName);
      setIsCopied(true);

      if (resetTimeoutRef.current) {
        window.clearTimeout(resetTimeoutRef.current);
      }

      resetTimeoutRef.current = window.setTimeout(() => {
        setIsCopied(false);
      }, 2500);
    } catch {
      // Swallow errors to avoid UI noise for clipboard permission failures.
    }
  };

  return (
    <button
      onClick={handleCopy}
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
      className="h-5 text-center flex flex-row gap-1 text-primary-text text-xs cursor-pointer min-w-0"
      // className="w-fit relative h-5 text-center flex flex-row text-primary-text px-1 -right-full -translate-x-full top-full text-xs items-center gap-1 cursor-pointer z-1"
    >
      <span className="truncate">{fieldName}</span>
      {isCopied ? (
        <div className="bg-green-light-6 rounded-full h-5 w-5 flex items-center justify-center">
          <CheckIcon className="w-4 h-4 text-green" />
        </div>
      ) : (
        <div className="hover:bg-gray-2 rounded-full h-5 w-5 flex items-center justify-center">
          <CopyIcon className="w-4 h-4 text-primary-text" />
        </div>
      )}
    </button>
  );
}
