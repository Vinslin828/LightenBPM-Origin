import { WidthAttribute } from "../../attributes/width/component";
import { LabelAttribute } from "../../attributes/label/component";
import { ButtonTextAttribute } from "../../attributes/button-text/component";
import { FileSizeAttribute } from "../../attributes/file-size/component";
import { SupportedFormatsAttribute } from "../../attributes/supported-formats/component";
import { EnableMultipleAttribute } from "../../attributes/enable-multiple/component";
import AttributePanelHeader from "../attribute-panel-header";
import { FileUploadIcon } from "@/components/icons";
import { EntityKey } from "@/types/form-builder";
import Accordion from "@ui/accordion";
import { NameAttribute } from "../../attributes/name/component";
import VisibilityAttributes from "../../attributes/visibility-attributes";

export function FileUploadFieldAttributes() {
  return (
    <>
      <AttributePanelHeader
        icon={<FileUploadIcon className="text-purple" />}
        componentType={EntityKey.buttonUpload}
        className="bg-purple/10 border-purple"
      />
      <Accordion
        key={EntityKey.buttonUpload}
        items={[
          {
            key: "general",
            name: "General",
            content: (
              <div className="flex flex-col gap-4">
                <NameAttribute />
                <LabelAttribute />
                <ButtonTextAttribute />
                <FileSizeAttribute />
                <SupportedFormatsAttribute />
                <EnableMultipleAttribute />
                <VisibilityAttributes type={EntityKey.buttonUpload} />
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
