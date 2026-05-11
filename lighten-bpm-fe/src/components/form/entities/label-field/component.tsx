import { createEntityComponent } from "@coltorapps/builder-react";
import { labelFieldEntity } from "./definition";
import { RichTextRenderer } from "@/components/ui/rich-text-editor";
import { useEntityLabel } from "@/hooks/useEntityLabel";

/**
 * Inject a plain-text translation into an HTML string while preserving the
 * original markup and styling.  Works by replacing the first non-empty text
 * node found in the tree using a temporary DOM element.
 *
 * e.g. injectTranslation('<h1 style="color:blue">請購資訊</h1>', 'Procurement Info')
 *      → '<h1 style="color:blue">Procurement Info</h1>'
 */
function injectTranslation(html: string, translation: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if ((node as Text).data.trim()) textNodes.push(node as Text);
  }
  if (textNodes.length > 0) {
    textNodes[0].data = translation;
    // Clear any additional text nodes so we don't duplicate content
    for (let i = 1; i < textNodes.length; i++) {
      textNodes[i].data = "";
    }
  }
  return tmp.innerHTML;
}

export const LabelFieldEntity = createEntityComponent(
  labelFieldEntity,
  function LabelFieldEntity({ entity }) {
    const richTextContent = entity.attributes.richText as string | undefined;
    const labelText =
      entity.attributes.label && typeof entity.attributes.label === "object"
        ? (entity.attributes.label as { value?: string }).value
        : "";

    // Strip HTML tags from richText to get the plain-text fallback for useEntityLabel
    const richTextStripped = richTextContent
      ? richTextContent.replace(/<[^>]*>/g, "").trim()
      : "";
    const plainFallback = richTextStripped || labelText || "Label";

    // Resolve translation (falls back to plainFallback when no translation exists)
    const translatedText = useEntityLabel(
      entity.id,
      plainFallback,
      entity.attributes.name,
    );
    const isTranslated = translatedText !== plainFallback;

    // Build the final HTML content:
    //  - If a translation is active, inject the translated text into the
    //    original HTML so heading level and styling are preserved.
    //  - Otherwise use the original content unchanged.
    const originalHtml =
      richTextContent || (labelText ? `<p>${labelText}</p>` : "<p>Label</p>");
    const content = isTranslated
      ? injectTranslation(originalHtml, translatedText)
      : originalHtml;

    return (
      <div className="w-full">
        <RichTextRenderer content={content} />
      </div>
    );
  },
);
