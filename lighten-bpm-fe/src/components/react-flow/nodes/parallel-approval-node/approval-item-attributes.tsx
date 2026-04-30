import { FormDefinition } from "@/types/domain";
import { ApprovalNodeType } from "@/types/flow";
import { SharedApprovalAttributes } from "../approval-node/approval-attributes";

type Props = {
  data: ApprovalNodeType["data"];
  onChange: (data: Partial<ApprovalNodeType["data"]>) => void;
  controlId?: string;
  formData?: Partial<FormDefinition>;
};

export default function ApprovalItemAttributes({
  data,
  onChange,
  controlId,
  formData,
}: Props) {
  return (
    <SharedApprovalAttributes
      data={data}
      onChange={onChange}
      controlId={controlId}
      formData={formData}
    />
  );
}
