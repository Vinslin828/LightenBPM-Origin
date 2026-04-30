import { CreateFormModal } from "@/components/modals/form-metadata-modal";
import { useCreateForm, useForm } from "@/hooks/useForm";
import { useModal } from "@/hooks/useModal";
import { useService } from "@/hooks/useService";
import { IFormService } from "@/interfaces/services";
import { TYPES } from "@/types/symbols";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@ui/button";
import { useNavigate } from "react-router-dom";

export default function DemoPage() {
  const { open, isOpen, close } = useModal();
  const { mutate: create } = useCreateForm();
  const formService = useService<IFormService>(TYPES.FormService);
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["forms", { limit: 100 }],
    queryFn: async () => {
      return formService.getForms({ limit: 100 });
    },
  });
  return (
    <div className="flex flex-col w-full min-h-screen items-center justify-center">
      bpm web
      <CreateFormModal
        isOpen={isOpen}
        close={close}
        onSubmit={(data) => {
          create(
            {
              name: data.name,
              description: data.description,
              tags: data.tags,
              validation: {
                required: false,
                validators: [],
              },
            },
            {
              onSuccess(data) {
                navigate(`/forms/${data.data?.id}`);
              },
            },
          );
        }}
      />
      <Button onClick={open}>Create Form</Button>
    </div>
  );
}
