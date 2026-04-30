import { createEntityComponent } from "@coltorapps/builder-react";
import { labelFieldEntity } from "./definition";
import { RichTextRenderer } from "@/components/ui/rich-text-editor";

export const LabelFieldEntity = createEntityComponent(
  labelFieldEntity,
  function LabelFieldEntity({ entity }) {
    const richTextContent = entity.attributes.richText as string | undefined;
    const labelText =
      entity.attributes.label && typeof entity.attributes.label === "object"
        ? (entity.attributes.label as { value?: string }).value
        : "";

    const content =
      richTextContent || (labelText ? `<p>${labelText}</p>` : "<p>Label</p>");

    return (
      <div className="w-full">
        <RichTextRenderer content={content} />
      </div>
    );
  },
);
