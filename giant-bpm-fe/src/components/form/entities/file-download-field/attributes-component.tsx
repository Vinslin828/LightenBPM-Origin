import { WidthAttribute } from "../../attributes/width/component";
import { LabelAttribute } from "../../attributes/label/component";
import { ButtonTextAttribute } from "../../attributes/button-text/component";
import { TargetFileUrlAttribute } from "../../attributes/target-file-url/component";
import { RequiredAttribute } from "../../attributes/required/component";
import { DisabledAttribute } from "../../attributes/disabled/component";
import { ReadonlyAttribute } from "../../attributes/readonly/component";
import AttributePanelHeader from "../attribute-panel-header";
import { FileDownloadIcon } from "@/components/icons";
import { EntityKey } from "@/types/form-builder";
import Accordion from "@ui/accordion";
import { NameAttribute } from "../../attributes/name/component";
import { HideAttribute } from "../../attributes/hide/component";
import VisibilityAttributes from "../../attributes/visibility-attributes";

export function FileDownloadFieldAttributes() {
  return (
    <>
      <AttributePanelHeader
        icon={<FileDownloadIcon className="text-purple" />}
        componentType={EntityKey.buttonDownload}
        className="bg-purple/10 border-purple"
      />
      <Accordion
        key={EntityKey.buttonDownload}
        items={[
          {
            key: "general",
            name: "General",
            content: (
              <div className="flex flex-col gap-4">
                <NameAttribute />
                <LabelAttribute />
                <ButtonTextAttribute />
                <TargetFileUrlAttribute />
                <VisibilityAttributes type={EntityKey.buttonDownload} />
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
