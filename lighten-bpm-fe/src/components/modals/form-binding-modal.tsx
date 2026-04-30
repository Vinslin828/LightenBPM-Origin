import { Modal } from "../ui/modal";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useService } from "@/hooks/useService";
import { IFormService } from "@/interfaces/services";
import { TYPES } from "@/types/symbols";
import { useQuery } from "@tanstack/react-query";
import { useTags } from "@/hooks/useMasterData";
import { FormDefinition } from "@/types/domain";
import { FormIcon } from "@/components/icons";
import { Input } from "../ui/input";
import { Search as SearchIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "../ui/button";

interface FormBindingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (form: FormDefinition) => void;
  selectedFormId?: string;
}

export default function FormBindingModal({
  isOpen,
  onClose,
  onConfirm,
  selectedFormId,
}: FormBindingModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [stagedFormId, setStagedFormId] = useState<string | undefined>(
    selectedFormId,
  );
  const listRef = useRef<HTMLDivElement>(null);
  const [showFooterShadow, setShowFooterShadow] = useState(false);

  const formService = useService<IFormService>(TYPES.FormService);

  const { data: formsData, isLoading } = useQuery({
    queryKey: ["forms", "binding-modal", { limit: 100 }],
    queryFn: () => formService.getForms({ limit: 100 }),
    enabled: isOpen,
  });

  const forms = formsData?.data?.items || [];

  useEffect(() => {
    if (isOpen) {
      setStagedFormId(selectedFormId);
    }
  }, [isOpen, selectedFormId]);

  const filteredForms = forms.filter((form: FormDefinition) =>
    form.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  useLayoutEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;

    const handleScroll = () => {
      const isScrollable = listElement.scrollHeight > listElement.clientHeight;
      const isAtBottom =
        listElement.scrollTop + listElement.clientHeight >=
        listElement.scrollHeight - 5; // 5px buffer
      setShowFooterShadow(isScrollable && !isAtBottom);
    };

    handleScroll();

    const resizeObserver = new ResizeObserver(handleScroll);
    resizeObserver.observe(listElement);
    listElement.addEventListener("scroll", handleScroll);

    return () => {
      resizeObserver.disconnect();
      listElement.removeEventListener("scroll", handleScroll);
    };
  }, [filteredForms, isLoading]);

  const handleConfirm = () => {
    const selectedForm = forms.find((form) => form.id === stagedFormId);
    if (selectedForm) {
      onConfirm(selectedForm);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} close={onClose}>
      <Modal.Body className="flex flex-col gap-6 p-0">
        <span className="font-semibold text-gray-800 text-2xl flex flex-row items-center w-full justify-center pt-7.5">
          Linked Form
        </span>
        <div className="px-6">
          <div className="relative w-full md:w-80">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search form..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-lg border-gray-300"
            />
          </div>
        </div>

        <div
          ref={listRef}
          className="relative overflow-y-auto max-h-[400px] w-full flex flex-col gap-2.5 p-6 pt-0"
        >
          {isLoading ? (
            <div className="text-center py-10 text-gray-500">Loading...</div>
          ) : filteredForms.length > 0 ? (
            filteredForms.map((form) => (
              <FormItem
                key={form.id}
                form={form}
                isSelected={stagedFormId === form.id}
                onSelect={() => setStagedFormId(form.id)}
              />
            ))
          ) : (
            <div className="text-center py-10 text-gray-500">
              No forms found.
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer
        className={cn({
          "shadow-[0_-10px_15px_-3px_rgb(0,0,0,0.1),_0_-4px_6px_-4px_rgb(0,0,0,0.1)]":
            showFooterShadow,
        })}
      >
        <Button variant="tertiary" onClick={onClose} className="w-full">
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!stagedFormId}
          className="w-full"
        >
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

interface FormItemProps {
  form: FormDefinition;
  isSelected: boolean;
  onSelect: () => void;
}

function FormItem({ form, isSelected, onSelect }: FormItemProps) {
  // const { getTagsColor: getDepartmentColors } = useTags();
  // const departmentColor = getDepartmentColors(form.tags) || "#A0AEC0";
  // const departmentBgColor = `${departmentColor}20`;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex items-start p-5 rounded-lg border text-left transition-colors w-full",
        isSelected
          ? "border-2 border-blue-600 bg-blue-50"
          : "border-gray-200 hover:border-blue-400",
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-gray-2">
          <FormIcon className="w-5 h-5 text-secondary-text" />
        </div>
        <div>
          {/* <p className="text-sm font-medium" style={{ color: departmentColor }}>
            {form.tags.length > 0 && form.tags[0].name}
          </p> */}
          <p className="text-lg font-semibold text-dark">{form.name}</p>
        </div>
      </div>
    </button>
  );
}
