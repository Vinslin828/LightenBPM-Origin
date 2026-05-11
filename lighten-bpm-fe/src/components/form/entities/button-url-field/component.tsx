import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createEntityComponent } from "@coltorapps/builder-react";
import { buttonUrlFieldEntity } from "./definition";
import { Link } from "lucide-react";
import { useEntityLabel } from "@/hooks/useEntityLabel";

export const ButtonUrlFieldEntity = createEntityComponent(
  buttonUrlFieldEntity,
  function ButtonUrlFieldEntity(props) {
    const label = useEntityLabel(
      props.entity.id,
      props.entity.attributes.label.value || props.entity.attributes.name,
      props.entity.attributes.name,
    );

    const buttonText = props.entity.attributes.buttonText?.trim()
      ? props.entity.attributes.buttonText
      : "Open";

    const isButton = props.entity.attributes.isButton !== false; // default true if not false
    const targetUrl = props.entity.attributes.targetUrl || "#";
    const openNewTab = props.entity.attributes.openNewTab !== false;

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (props.entity.attributes.targetUrl) {
        window.open(
          props.entity.attributes.targetUrl,
          openNewTab ? "_blank" : "_self",
          openNewTab ? "noopener,noreferrer" : undefined,
        );
      }
    };

    return (
      <div>
        <Label aria-required={props.entity.attributes.required}>{label}</Label>
        <div className="mt-1">
          {isButton ? (
            <Button
              type="button"
              variant="tertiary"
              onClick={handleClick}
              aria-label={`Open ${label}`}
              tabIndex={0}
            >
              <Link className="mr-2 h-4 w-4" />
              {buttonText}
            </Button>
          ) : (
            <a
              href={targetUrl}
              onClick={handleClick}
              className="text-primary hover:underline flex items-center gap-1 text-sm font-medium"
              aria-label={`Open ${label}`}
              tabIndex={0}
            >
              <Link className="h-4 w-4" />
              {buttonText}
            </a>
          )}
        </div>
      </div>
    );
  },
);
