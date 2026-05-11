import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createEntityComponent } from "@coltorapps/builder-react";
import { buttonUrlEntity } from "./definition";
import { cn } from "@/utils/cn";
import { useEntityLabel } from "@/hooks/useEntityLabel";

export const ButtonUrlEntity = createEntityComponent(
  buttonUrlEntity,
  function ButtonUrlEntity(props) {
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
      if (props.entity.attributes.disabled) return;
      if (props.entity.attributes.targetUrl) {
        window.open(
          props.entity.attributes.targetUrl,
          openNewTab ? "_blank" : "_self",
          openNewTab ? "noopener,noreferrer" : undefined,
        );
      }
    };

    return (
      <div className="w-full">
        <Label aria-required={props.entity.attributes.required}>{label}</Label>
        <div className="mt-1">
          {isButton ? (
            <Button
              type="button"
              variant="tertiary"
              onClick={handleClick}
              aria-label={`Open ${label}`}
            >
              {buttonText}
            </Button>
          ) : (
            <a
              href={targetUrl}
              onClick={handleClick}
              className={cn(
                "text-center justify-center text-lighten-blue text-base font-medium underline",
                props.entity.attributes.disabled &&
                  "text-secondary-text cursor-not-allowed",
              )}
              aria-label={`Open ${label}`}
              tabIndex={0}
            >
              {buttonText}
            </a>
          )}
        </div>
      </div>
    );
  },
);
