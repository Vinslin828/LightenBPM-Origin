import { ConditionBranch, UiExpression } from "@/types/flow";

const getConditionTreeName = (tree?: ConditionBranch["branch"]): string => {
  if (!tree) {
    return "";
  }

  // Base case: the branch is a single expression
  if ("field" in tree) {
    const expression = tree as UiExpression;
    const valueStr =
      typeof expression.value === "string"
        ? `'${expression.value}'`
        : expression.value;
    return `${expression.field} ${expression.operator} ${valueStr}`;
  }

  // Recursive step: the branch is a logic combination
  if ("logic" in tree) {
    const leftStr = getConditionTreeName(tree.left);
    const rightStr = getConditionTreeName(tree.right);

    if (leftStr && rightStr) {
      return `(${leftStr}) ${tree.logic} (${rightStr})`;
    }
    // If one side is empty, just return the other.
    return leftStr || rightStr;
  }

  return "";
};
export default getConditionTreeName;
