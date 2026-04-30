import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Pagination from "@/components/ui/pagination";
import { useForms, useDeleteForm } from "@/hooks/useForm";
import { FormDefinition, FormListOptions } from "@/types/domain";
import Menu from "@ui/menu";
import { IconDots } from "@tabler/icons-react";
import { useToast } from "@ui/toast";
import DeleteModal from "../modals/delete-modal";
import { useModal } from "@/hooks/useModal";

type FormListProps = {
  options: FormListOptions;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
};

export function FormList({
  options,
  onPageChange,
  onPageSizeChange,
  className,
}: FormListProps) {
  const memoizedOptions = useMemo(() => options, [options]);
  const {
    data: formListData,
    forms,
    isLoading,
    refetch,
  } = useForms(memoizedOptions);
  const { toast } = useToast();
  const { mutate: deleteForm } = useDeleteForm({
    onSuccess() {
      refetch();
      toast({
        variant: "success",
        description: "Delete form successfully.",
      });
    },
  });

  const showInitialLoading = isLoading && !formListData;
  const isEmpty = !forms.length && !showInitialLoading;

  if (showInitialLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="mt-6 flex flex-col gap-5 min-h-full flex-1">
        {forms.map((form) => (
          <FormCard
            form={form}
            key={form.id}
            onDelete={() => deleteForm(form.id)}
          />
        ))}

        {isEmpty && (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-[#DFE4EA] bg-white p-16 text-center flex-1 min-h-full">
            <span className="mt-4 text-lg font-semibold text-primary-text">
              No forms found
            </span>
            <p className="mt-1 text-sm text-secondary-text font-regular">
              Try adjust your search criteria
            </p>
          </div>
        )}
        {formListData && (
          <Pagination
            totalPages={formListData.totalPages}
            page={formListData.page}
            pageSize={formListData.limit}
            onPageChange={onPageChange}
            // onPageSizeChange={(size) => {
            //   onPageSizeChange(size);
            // }}
            pageSizeOptions={[10, 20, 50]}
            className="mt-4"
          />
        )}
      </div>
    </>
  );
}

type FormCardProps = {
  form: FormDefinition;
  onDelete: () => void;
};

function FormCard({ form, onDelete }: FormCardProps) {
  const navigate = useNavigate();
  const modal = useModal();
  return (
    <>
      <DeleteModal
        {...modal}
        onDelete={() => {
          modal.close();
          onDelete();
        }}
        message="Are you sure you want to delete this form?"
      />
      <div
        key={form.id}
        className="bg-white rounded-lg border border-[#DFE4EA] p-5"
        onClick={() => navigate(`/forms/${form.id}`)}
      >
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div>
              <h3 className="text-lg font-semibold text-[#111928] mb-4">
                {form.name}
              </h3>
              <p className="text-base text-[#111928]">{form.description}</p>
            </div>
          </div>
          <Menu
            items={[
              {
                label: (
                  <div className="text-red text-sm font-medium my-1">
                    Discard
                  </div>
                ),
                onClick: () => modal.open(),
              },
            ]}
            trigger={
              <div className="p-2">
                <IconDots className="text-secondary-text cursor-pointer h-5 w-5" />
              </div>
            }
          />
        </div>
      </div>
    </>
  );
}
