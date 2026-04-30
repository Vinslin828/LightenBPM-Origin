import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createEntityComponent } from "@coltorapps/builder-react";
import { fileDownloadFieldEntity } from "./definition";

export const FileDownloadFieldEntity = createEntityComponent(
  fileDownloadFieldEntity,
  function FileDownloadFieldEntity(props) {
    const label = !!props.entity.attributes.label.value
      ? props.entity.attributes.label.value
      : props.entity.attributes.name;

    const buttonText = props.entity.attributes.buttonText?.trim()
      ? props.entity.attributes.buttonText
      : "Download";

    return (
      <div>
        <Label aria-required={props.entity.attributes.required}>{label}</Label>
        <div className="mt-1">
          <Button
            type="button"
            variant="tertiary"
            onClick={() => {
              const url = props.entity.attributes.targetFileUrl;
              if (url) {
                window.open(url, "_blank", "noopener,noreferrer");
              }
            }}
            aria-label={`Download ${label}`}
            tabIndex={0}
            disabled={props.entity.attributes.disabled}
          >
            {buttonText}
          </Button>
        </div>
      </div>
    );
  },
);
