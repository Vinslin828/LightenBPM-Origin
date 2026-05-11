import {
  ConditionBranch,
  BranchLogic,
  type UiExpression,
  WorkflowNodeKey,
  FormNodeType,
  type Operator,
  CodeExpression,
  numberOperatorOptions,
  stringOperatorOptions,
} from "@/types/flow";
import { Button } from "@/components/ui/button";
import { SingleSelect } from "@ui/select/single-select";
import { Input } from "@/components/ui/input";
import { useFlowBuilder } from "@/hooks/useFlowBuilder";
import { useEffect, useMemo } from "react";
import { DeleteIcon, PlusIcon } from "@/components/icons";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

import getConditionTreeName from "@/utils/get-tree-name";
import { useToast } from "@ui/toast";
import { EntityKey } from "@/types/form-builder";
import { DatePicker } from "@ui/datetime-selector";
import CodeToggle from "@ui/code-toggle";
import CodeEditButton from "@ui/button/code-edit-button";
import { useConditionNodeHelper } from "@/hooks/useFlowBuilder/useConditionHelper";

const getOperatorOptionsByType = (type?: EntityKey) => {
  if (type === EntityKey.numberField || type === EntityKey.datePickerField) {
    return numberOperatorOptions;
  }
  if (type === EntityKey.expressionField) {
    return [...numberOperatorOptions, ...stringOperatorOptions];
  }
  if (type === EntityKey.textField || type === EntityKey.textareaField) {
    return stringOperatorOptions;
  }
  return stringOperatorOptions;
};

const numberOperators = new Set<Operator>(
  numberOperatorOptions.map((option) => option.value),
);

type ConditionProps = {
  initialData?: ConditionBranch[];
  nodeId: string;
};

export default function Condition({ nodeId }: ConditionProps) {
  const { node, branches, removeBranch } = useConditionNodeHelper(nodeId);

  const { updateNode } = useFlowBuilder();
  const handleBranchesChange = (newBranches: ConditionBranch[]) => {
    updateNode(nodeId, { conditions: newBranches });
  };

  const { addConditionBranch, insertNodeAfter, deleteSubtree } =
    useFlowBuilder();

  useEffect(() => {
    const fallBackBranch = branches.find(
      (branch) => branch.name === "fallback-branch",
    );
    if (!fallBackBranch) {
      console.error("missing fall back branch", branches);
    } else if (!fallBackBranch?.next) {
      console.debug("trigger", fallBackBranch);
      insertNodeAfter(WorkflowNodeKey.Placeholder, nodeId, {
        label: "FallBack",
      }).then((newNode) => {
        const _fallBackBranch = {
          ...fallBackBranch,
          next: newNode?.id ?? null,
        };

        updateNode(nodeId, {
          ...node.data,
          conditions: [_fallBackBranch],
        });
      });
    }
  }, [nodeId, branches, insertNodeAfter, updateNode]);

  const addBranch = async () => {
    await addConditionBranch(WorkflowNodeKey.Placeholder, nodeId, {
      label: "Condition:",
      index: branches.length,
    });
  };
  const removeBranchLocally = async (index: number) => {
    // The comment indicates the index from the filtered UI needs to be offset.
    const actualIndex = index + 1;
    await removeBranch(actualIndex);
  };

  return (
    <div className="flex flex-col gap-4" key={nodeId}>
      {/* TODO: header: condition count, add branch button, collapse */}
      {branches
        .filter((branch) => branch.name !== "fallback-branch")
        .map((branch, index) => (
          <Branch
            key={index}
            value={branch}
            onChange={(newBranch) => {
              const newBranches = [...(branches ?? [])];
              newBranches[index + 1] = newBranch;
              console.debug({ newBranches, branches });
              handleBranchesChange(newBranches);
            }}
            index={index}
            nodeId={nodeId}
            onRemove={() => removeBranchLocally(index)}
          />
        ))}
      <Button
        variant={"secondary"}
        className="bg-white"
        onClick={() => addBranch()}
      >
        Add Branch
      </Button>
    </div>
  );
}

function ConditionLogicSelector({
  value,
  onChange,
}: {
  value: BranchLogic;
  onChange: (value: BranchLogic) => void;
}) {
  return (
    <div className="flex flex-row w-[73px] h-8 bg-lighten-blue/10 border border-lighten-blue rounded-3xl text-lighten-blue text-sm items-center">
      <select
        className="appearance-none pl-3 h-8 w-[73px] focus-visible:outline-0"
        onChange={(e) => onChange(e.target.value as BranchLogic)}
        value={value}
      >
        <option value={"AND"}>AND</option>
        <option value={"OR"}>OR</option>
      </select>
      <ChevronDown className="text-lighten-blue p-1 relative right-2 w-8 h-8" />
    </div>
    // <Select
    //   className="w-[73px] border-lighten-blue rounded-3xl h-8 text-lighten-blue bg-lighten-blue/10 flex items-center justify-center py-0 pl-2"
    //   value={value}
    //   onChange={(val) => onChange(val as BranchLogic)}
    //   options={[
    //     { label: "AND", value: "AND" },
    //     { label: "OR", value: "OR" },
    //   ]}
    // />
  );
}

type BranchProps = {
  value: ConditionBranch;
  onChange: (value: ConditionBranch) => void;
  nodeId: string;
  onRemove: () => void;
  index: number;
};

function Branch({ value, onChange, nodeId, onRemove, index }: BranchProps) {
  const { flattenTree, rebuildTree } = useConditionNodeHelper(nodeId);

  const flatCondition = useMemo(
    () => (value.isExpression ? [] : flattenTree(value.branch)),
    [value.branch],
  );

  const addExpression = () => {
    const newExpression: UiExpression = {
      field: "",
      operator: ">",
      value: "",
    };
    if (flatCondition.length > 0) {
      flatCondition.push("AND" as BranchLogic);
    }
    flatCondition.push(newExpression);

    onChange({
      ...value,
      isExpression: false,
      name: getConditionTreeName(rebuildTree(flatCondition)),
      branch: rebuildTree(flatCondition),
    });
  };

  const handleCodeToggle = (newValue: "code" | "manual") => {
    if (newValue === "code") {
      onChange({
        ...value,
        isExpression: true,
        branch: {
          expression: "",
        },
      });
      return;
    }

    onChange({
      ...value,
      isExpression: false,
      branch: {
        field: "",
        operator: ">",
        value: "",
      },
    });
  };

  const updateItem = (
    index: number,
    item: CodeExpression | UiExpression | BranchLogic,
  ) => {
    if (value.isExpression) {
      onChange({
        ...value,
        isExpression: true,
        branch: item as CodeExpression,
      });
      return;
    } else {
      const newFlatCondition = [...flatCondition];
      console.debug({ newFlatCondition });
      newFlatCondition[index] = item as UiExpression | BranchLogic;
      onChange({
        ...value,
        name: getConditionTreeName(rebuildTree(newFlatCondition)),
        branch: rebuildTree(newFlatCondition),
      });
    }
  };

  // const removeExpression = (index: number) => {
  //   let newFlatCondition = [...flatCondition];
  //   if (index > 0) {
  //     // Remove the expression and the logic operator before it
  //     newFlatCondition.splice(index - 1, 2);
  //   } else {
  //     // Remove the first expression and the logic operator after it (if it exists)
  //     newFlatCondition.splice(index, newFlatCondition.length > 1 ? 2 : 1);
  //   }
  //   onChange({ ...value, branch: rebuildTree(newFlatCondition) });
  // };

  return (
    <div className="bg-white border border-stroke rounded-md p-3 flex flex-col gap-2">
      <div className="flex flex-row gap-2 py-1 justify-between items-center">
        {/* <DragIndicatorIcon className="fill-secondary-text" /> */}
        <div className="flex w-5 h-5 items-center justify-center rounded-full bg-gray-2 text-primary-text text-xs">
          {index + 1}
        </div>
        <div className="dark flex-1">Condition</div>
        <CodeToggle
          value={value.isExpression ? "code" : "manual"}
          onChange={handleCodeToggle}
        />
        <div className="w-[1px] bg-stroke h-5" />
        <Button
          className="p-0"
          variant={"ghost"}
          onClick={addExpression}
          disabled={flatCondition.length > 2 || value.isExpression}
        >
          <PlusIcon
            className={cn(
              "text-lighten-blue w-6 h-6",
              (flatCondition.length > 2 || value.isExpression) &&
                "text-stroke cursor-not-allowed",
            )}
          />
        </Button>
        <Button className="p-0" variant={"ghost"} onClick={onRemove}>
          <DeleteIcon className="text-secondary-text" />
        </Button>
        {/* <ChevronUp className="text-secondary-text w-6" /> */}
      </div>
      {value.isExpression ? (
        <CodeExpressionComponent
          value={value.branch as CodeExpression}
          onChange={(code) =>
            onChange({
              ...value,
              isExpression: true,
              branch: { expression: code },
            })
          }
        />
      ) : (
        <div className="space-y-2">
          {flatCondition.map((item, index) => {
            if (typeof item === "string") {
              return (
                <div className="w-full flex flex-row items-center justify-around">
                  <div className="h-[1px] w-full bg-stroke" />
                  <ConditionLogicSelector
                    key={index}
                    value={item}
                    onChange={(newLogic) => updateItem(index, newLogic)}
                  />
                  <div className="h-[1px] w-full bg-stroke" />
                  <div className="h-1px] bg-stroke" />
                </div>
              );
            } else {
              return (
                <div key={index} className="flex items-center gap-2">
                  <UiExpressionComponent
                    value={item as UiExpression}
                    onChange={(newExpr) => updateItem(index, newExpr)}
                  />
                  {/* <Button
                  onClick={() => removeExpression(index)}
                  variant="ghost"
                  className="shrink-0 p-1"
                >
                  <span className="text-red-500 font-bold">×</span>
                </Button> */}
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}

type UiExpressionComponentProps = {
  value: UiExpression;
  onChange: (value: UiExpression) => void;
};
function UiExpressionComponent({
  value,
  onChange,
}: UiExpressionComponentProps) {
  const { getNodeById } = useFlowBuilder();
  const formNode = getNodeById("form-node") as FormNodeType | undefined;
  const { toast } = useToast();

  const formFieldOptions = useMemo(() => {
    if (!formNode?.data?.form?.schema?.entities) {
      return [];
    }
    return Object.entries(formNode.data.form.schema.entities).map(
      ([id, entity]) => ({
        isReference: false,
        label: entity.attributes?.label.value || id,
        value: `getFormField("${entity.attributes.name}").value`,
        type: entity.type as EntityKey,
        key: `getFormField("${entity.attributes.name}").value`,
      }),
    );
  }, [formNode]);

  useEffect(() => {
    // console.debug(formNode);
    if (
      formNode &&
      Object.entries(formNode.data.form?.schema?.entities ?? {}).length === 0
    ) {
      toast({
        variant: "destructive",
        description:
          "Please select a form that contains form fields under form node to use condition node.",
      });
    }
  }, [formNode]);
  const selectedField = useMemo(
    () => formFieldOptions.find((option) => option.value === value.field),
    [formFieldOptions, value.field],
  );

  const operatorOptions = useMemo(
    () => getOperatorOptionsByType(selectedField?.type),
    [selectedField?.type],
  );

  const ensureOperator = (operator: Operator): Operator => {
    return operatorOptions.some((opt) => opt.value === operator)
      ? operator
      : (operatorOptions[0]?.value ?? operator);
  };

  const renderValueField = () => {
    if (selectedField?.type === EntityKey.datePickerField) {
      return (
        <DatePicker
          name={`condition-${value.field || "date"}`}
          className="flex-1 w-full min-w-[150px] max-h-12"
          placeholder="Date"
          value={typeof value.value === "number" ? value.value : undefined}
          onChange={(date) => onChange({ ...value, value: date })}
        />
      );
    }

    if (
      selectedField?.type === EntityKey.numberField ||
      (selectedField?.type === EntityKey.expressionField &&
        numberOperators.has(value.operator))
    ) {
      return (
        <Input
          type="number"
          placeholder="Number"
          className="flex-1 w-full min-w-[150px]"
          value={typeof value.value === "number" ? value.value : ""}
          onChange={(e) =>
            onChange({
              ...value,
              value: e.target.value === "" ? undefined : Number(e.target.value),
            })
          }
        />
      );
    }

    return (
      <Input
        type="text"
        placeholder="String"
        className="flex-1 min-w-[150px]"
        value={typeof value.value === "string" ? value.value : ""}
        onChange={(e) =>
          onChange({
            ...value,
            value: e.target.value,
          })
        }
      />
    );
  };

  // render ui expression

  return (
    <div className="flex flex-col gap-2">
      <SingleSelect
        options={formFieldOptions}
        value={value.field}
        onChange={(field) => {
          console.debug({ formFieldOptions });
          const targetField = formFieldOptions.find(
            (option) => option.value === field,
          );
          const availableOps = getOperatorOptionsByType(targetField?.type);
          onChange({
            ...value,
            field,
            operator: availableOps[0]?.value ?? value.operator,
            value: undefined,
          });
        }}
        placeholder="Select field"
      />
      <div className="flex flex-row gap-2 w-full">
        <SingleSelect
          options={operatorOptions}
          value={ensureOperator(value.operator)}
          onChange={(operator) =>
            onChange({
              ...value,
              operator: operator as Operator,
              value: undefined,
            })
          }
          placeholder="Operator"
        />
        {renderValueField()}
      </div>
    </div>
  );
}

type CodeExpressionComponentProps = {
  value: CodeExpression;
  onChange: (value: string) => void;
};
function CodeExpressionComponent({
  value,
  onChange,
}: CodeExpressionComponentProps) {
  console.debug({ value });
  const { getNodeById } = useFlowBuilder();
  const formNode = getNodeById("form-node") as FormNodeType | undefined;

  const formSchema = useMemo(
    () => formNode?.data.form?.schema,
    [formNode?.data.form?.schema],
  );

  return (
    <CodeEditButton
      variant="validation"
      value={
        !!value.expression
          ? value.expression
          : "function condition(){\n // must return true or false;\n // getFormField('field_name').value;\n return true;\n}"
      }
      trigger={value.expression}
      onSave={onChange}
      formSchema={formSchema}
      validationReturnType="boolean"
      showApiToggle={false}
      contextPreset={{
        value: "",
        filter: {},
        sorter: {},
      }}
    />
  );
}
