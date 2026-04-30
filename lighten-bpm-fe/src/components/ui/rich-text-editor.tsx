import { useEffect, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { cn } from "@/utils/cn";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Highlighter,
} from "lucide-react";

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  children,
  title,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-1.5 rounded hover:bg-gray-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer",
        isActive && "bg-gray-2 text-lighten-blue",
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-stroke mx-1" />;
}

function Toolbar({
  editor,
  currentColor,
  setCurrentColor,
}: {
  editor: Editor;
  currentColor: string;
  setCurrentColor: (color: string) => void;
}) {
  const iconSize = 16;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-stroke px-2 py-1.5">
      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 size={iconSize} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold"
      >
        <Bold size={iconSize} />
      </ToolbarButton>
      {/* <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic"
      >
        <Italic size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="Underline"
      >
        <UnderlineIcon size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough size={iconSize} />
      </ToolbarButton> */}
      {/* <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive("highlight")}
        title="Highlight"
      >
        <Highlighter size={iconSize} />
      </ToolbarButton> */}
      <label
        title="Text color"
        className="relative p-1.5 rounded hover:bg-gray-2 cursor-pointer transition-colors"
      >
        <div
          className="w-4 h-4 rounded-xs border border-stroke"
          style={{ backgroundColor: currentColor }}
        />
        <input
          type="color"
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          value={currentColor}
          onChange={(e) => {
            setCurrentColor(e.target.value);
            editor.chain().focus().setColor(e.target.value).run();
          }}
        />
      </label>

      {/* <ToolbarDivider /> */}

      {/* Text alignment */}
      {/* <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        isActive={editor.isActive({ textAlign: "left" })}
        title="Align left"
      >
        <AlignLeft size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        isActive={editor.isActive({ textAlign: "center" })}
        title="Align center"
      >
        <AlignCenter size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        isActive={editor.isActive({ textAlign: "right" })}
        title="Align right"
      >
        <AlignRight size={iconSize} />
      </ToolbarButton> */}

      {/* <ToolbarDivider /> */}

      {/* Lists */}
      {/* <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Bullet list"
      >
        <List size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Ordered list"
      >
        <ListOrdered size={iconSize} />
      </ToolbarButton>

      <ToolbarDivider /> */}

      {/* Undo/Redo */}
      {/* <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        <Undo size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
        <Redo size={iconSize} />
      </ToolbarButton> */}
    </div>
  );
}

const extensions = [
  StarterKit,
  Underline,
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
];

const editorContentClasses = cn(
  "[&_.tiptap]:outline-none [&_.tiptap]:min-h-[80px] [&_.tiptap]:px-3 [&_.tiptap]:py-2 [&_.tiptap]:text-sm",
  "[&_.tiptap_h1]:text-2xl [&_.tiptap_h1]:font-bold [&_.tiptap_h1]:mb-2",
  "[&_.tiptap_h2]:text-xl [&_.tiptap_h2]:font-semibold [&_.tiptap_h2]:mb-2",
  "[&_.tiptap_h3]:text-lg [&_.tiptap_h3]:font-semibold [&_.tiptap_h3]:mb-1",
  "[&_.tiptap_p]:mb-1",
  "[&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-5 [&_.tiptap_ul]:mb-1",
  "[&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-5 [&_.tiptap_ol]:mb-1",
  "[&_.tiptap_mark]:bg-yellow-200",
);

export interface RichTextEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  editable?: boolean;
  className?: string;
}

export function RichTextEditor({
  content = "",
  onChange,
  editable = true,
  className,
}: RichTextEditorProps) {
  const [currentColor, setCurrentColor] = useState("#000000");

  const editor = useEditor({
    extensions,
    content,
    editable,
    onUpdate: ({ editor: e }) => {
      setCurrentColor(e.getAttributes("textStyle").color ?? "#000000");
      onChange?.(e.getHTML());
    },
    onSelectionUpdate: ({ editor: e }) => {
      setCurrentColor(e.getAttributes("textStyle").color ?? "#000000");
    },
  });

  if (!editor) return null;

  return (
    <div
      className={cn(
        "rounded-[6px] border border-stroke bg-white overflow-hidden",
        "focus-within:border-[1.5px] focus-within:border-lighten-blue",
        className,
      )}
    >
      {editable && (
        <Toolbar
          editor={editor}
          currentColor={currentColor}
          setCurrentColor={setCurrentColor}
        />
      )}
      <EditorContent editor={editor} className={editorContentClasses} />
    </div>
  );
}

export interface RichTextRendererProps {
  content?: string;
  className?: string;
}

export function RichTextRenderer({
  content,
  className,
}: RichTextRendererProps) {
  const editor = useEditor({
    extensions,
    content: content || "",
    editable: false,
  });

  useEffect(() => {
    if (editor && content !== undefined) {
      const currentHTML = editor.getHTML();
      if (currentHTML !== content) {
        editor.commands.setContent(content || "");
      }
    }
  }, [editor, content]);

  if (!editor) return null;

  return (
    <EditorContent
      editor={editor}
      className={cn(
        "[&_.tiptap]:outline-none [&_.tiptap]:text-sm",
        "[&_.tiptap_h1]:text-2xl [&_.tiptap_h1]:font-bold [&_.tiptap_h1]:mb-2",
        "[&_.tiptap_h2]:text-xl [&_.tiptap_h2]:font-semibold [&_.tiptap_h2]:mb-2",
        "[&_.tiptap_h3]:text-lg [&_.tiptap_h3]:font-semibold [&_.tiptap_h3]:mb-1",
        "[&_.tiptap_p]:mb-1",
        "[&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-5 [&_.tiptap_ul]:mb-1",
        "[&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-5 [&_.tiptap_ol]:mb-1",
        "[&_.tiptap_mark]:bg-yellow-200",
        className,
      )}
    />
  );
}
