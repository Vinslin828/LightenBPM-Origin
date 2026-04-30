import { createAttributeComponent } from "@coltorapps/builder-react";
import { richTextAttribute } from "./definition";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

export const RichTextAttributeComponent = createAttributeComponent(
  richTextAttribute,
  function RichTextAttributeComponent(props) {
    return (
      <div>
        <label className="text-dark font-medium text-sm block pb-1.5">
          Label
        </label>
        <RichTextEditor
          key={props.entity.id} // force remount when entity changes to reset editor state
          content={props.attribute.value ?? ""}
          onChange={(html) => {
            props.setValue(html);
          }}
        />
      </div>
    );
  },
);
