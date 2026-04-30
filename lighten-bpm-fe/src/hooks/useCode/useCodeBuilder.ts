import { builderStoreAtom, interpreterStoreAtom } from "@/store";
import { FormSchema } from "@/types/domain";
import { useAtom } from "jotai";
import { useMemo } from "react";
import {
  ValidationReturnType,
  CodeValidationContext,
} from "./types";
import {
  executeCodeWithBindings,
  extractReferencedFieldNames,
  getSchemaFieldNames,
} from "./utils";

type Options =
  | {
      formSchema?: FormSchema;
    }
  | undefined;

type ValidationOptions = {
  context?: CodeValidationContext;
  returnTypes?: ValidationReturnType[];
};

export function useCodeBuilder(options?: Options) {
  const [bStore] = useAtom(builderStoreAtom);
  const [iStore] = useAtom(interpreterStoreAtom);
  const schemaFieldNames = useMemo(() => {
    if (options?.formSchema) {
      return getSchemaFieldNames(options.formSchema);
    }
    if (bStore) {
      return getSchemaFieldNames(bStore.getSchema());
    }
    if (iStore) {
      return getSchemaFieldNames(iStore.schema);
    }
    return [];
  }, [bStore, iStore, options?.formSchema]);

  function checkFieldNames(code: string) {
    const referenced = extractReferencedFieldNames(code);
    const missing = referenced.filter(
      (name) => !schemaFieldNames.includes(name),
    );
    if (missing.length > 0) {
      throw new Error(
        `Unknown field reference: ${missing.join(", ")}.\nAvailable field names: ${schemaFieldNames.join(", ")}`,
      );
    }
    return { success: missing.length === 0, referenced, missing };
  }

  function executeCode(code: string) {
    const mockGetFormField = (_name: string) => ({
      value: undefined as
        | string
        | string[]
        | number
        | boolean
        | null
        | undefined,
      currencyCode: undefined as string | undefined,
    });
    const mockGetApplicantProfile = () => ({
      id: "",
      lang: "en",
      name: "",
      email: "",
      jobGrade: 0,
      defaultOrgId: "",
    });
    const mockGetApplication = () => ({
      serialNumber: "",
      appliedAt: Date.now(),
      applicantId: "",
    });
    const mockGetCurrentNode = () => ({
      key: "",
      type: "",
      status: "",
      desc: "",
      parent_keys: [] as string[],
      child_keys: [] as string[],
      approvalMethod: "",
      approvalGroups: [] as unknown[],
    });
    const mockGetMasterData = (_tableKey: string) => [];
    const mockFetch = (_url: string, _options?: unknown) => ({
      status: 200,
      statusText: "OK",
      ok: true,
      headers: {},
      body: "{}",
      json: () => ({}),
      text: () => "",
    });

    return executeCodeWithBindings(code, [
      { name: "getFormField", value: mockGetFormField },
      { name: "getApplicantProfile", value: mockGetApplicantProfile },
      { name: "getApplication", value: mockGetApplication },
      { name: "getCurrentNode", value: mockGetCurrentNode },
      { name: "Date", value: Date },
      { name: "getMasterData", value: mockGetMasterData },
      { name: "fetch", value: mockFetch },
    ]);
  }

  function executeCodeFunction(code: string) {
    const maybeFn = executeCode(code);
    if (typeof maybeFn !== "function") {
      throw new Error("Expression must be a function.");
    }
    return maybeFn as (...args: unknown[]) => unknown;
  }

  function checkJsSyntax(code: string, context?: CodeValidationContext) {
    /**
     * build in functions: according to src/types/expression.md
     */

    try {
      const execute = executeCodeFunction(code);
      execute(context?.value, context);
      return { success: true };
    } catch (error) {
      throw new Error(
        `Syntax error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  function checkReturnValue(
    code: string,
    options?: ValidationOptions,
  ) {
    try {
      const execute = executeCodeFunction(code);
      const output = execute(options?.context?.value, options?.context);
      const allowedReturnTypes = options?.returnTypes ?? ["any"];

      if (allowedReturnTypes.includes("any")) {
        return;
      }

      if (allowedReturnTypes.includes("boolean") && typeof output === "boolean") {
        return;
      }

      if (allowedReturnTypes.includes("validationObject")) {
        const returnValue = output as {
          isValid?: unknown;
          error?: unknown;
        };
        const isValidationObject =
          !!output &&
          typeof output === "object" &&
          typeof returnValue.isValid === "boolean" &&
          (returnValue.error === undefined ||
            returnValue.error === null ||
            typeof returnValue.error === "string");
        if (isValidationObject) {
          return;
        }
      }

      throw new Error(
        "Expression return type is invalid for this mode configuration.",
      );
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Invalid return value.",
      );
    }
  }

  /** building form */
  function validateReference(code: string) {
    // code: getFormField('text_12345').value + getFormField('number_68909).value
    try {
      checkFieldNames(code);

      checkJsSyntax(`function() { return ${code};}`);
      return {
        isValid: true,
        errors: [],
      };
    } catch (error) {
      return {
        isValid: false,
        errors: error instanceof Error ? [error.message] : [String(error)],
      };
    }
  }
  function validateValidator(code: string, options?: ValidationOptions) {
    try {
      checkFieldNames(code);
      checkJsSyntax(code, options?.context);
      checkReturnValue(code, {
        context: options?.context,
        returnTypes: options?.returnTypes ?? ["boolean", "validationObject"],
      });
      return {
        isValid: true,
        errors: [],
      };
    } catch (error) {
      return {
        isValid: false,
        errors: error instanceof Error ? [error.message] : [String(error)],
      };
    }
  }
  /** building form */
  function validateCondition(code: string, options?: ValidationOptions) {
    try {
      checkFieldNames(code);
      checkJsSyntax(code, options?.context);
      checkReturnValue(code, {
        context: options?.context,
        returnTypes: options?.returnTypes ?? ["boolean"],
      });
      return {
        isValid: true,
        errors: [],
      };
    } catch (error) {
      return {
        isValid: false,
        errors: error instanceof Error ? [error.message] : [String(error)],
      };
    }
  }

  return {
    validateReference,
    validateValidator,
    validateCondition,
  };
}
