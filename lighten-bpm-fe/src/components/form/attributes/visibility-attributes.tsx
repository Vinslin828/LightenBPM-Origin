import { VISIBILITY_OPTIONS, DEFAULT_VISIBILITY_OPTIONS } from "@/const/flow";
import { VisibilityAction } from "@/types/flow";
import { EntityKey } from "@/types/form-builder";
import { DisabledAttribute } from "./disabled/component";
import { HideAttribute } from "./hide/component";
import { ReadonlyAttribute } from "./readonly/component";
import { RequiredAttribute } from "./required/component";

type Props = { type: EntityKey };
export default function VisibilityAttributes(props: Props) {
  const visibilityOptions =
    VISIBILITY_OPTIONS[props.type] ?? DEFAULT_VISIBILITY_OPTIONS;

  return (
    <>
      {visibilityOptions.includes(VisibilityAction.HIDE) && <HideAttribute />}
      {visibilityOptions.includes(VisibilityAction.REQUIRED) && (
        <RequiredAttribute />
      )}
      {visibilityOptions.includes(VisibilityAction.EDITABLE) && (
        <ReadonlyAttribute />
      )}
      {visibilityOptions.includes(VisibilityAction.DISABLED) && (
        <DisabledAttribute />
      )}
    </>
  );
}
