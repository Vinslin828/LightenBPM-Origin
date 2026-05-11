import { atom } from "jotai";
import { Edge } from "@xyflow/react";
import { LayoutOptions, WorkflowNode } from "@/types/flow";
import { User } from "@/types/domain";
import { Validator } from "@/types/validator";
import { basicFormBuilder } from "@/components/form/builder/definition";
import { BuilderStore, InterpreterStore } from "@coltorapps/builder";
import { FormSetting } from "@/types/form-builder";
import { Application } from "@/types/application";
import { AttributeComponentProps } from "@coltorapps/builder-react";
import { gridHeaderAttribute } from "@/components/form/attributes/grid-header/definition";
import { DatasetRecord } from "@/types/master-data-dataset";

// User authentication state
export const userAtom = atom<User | null>(null);

// Theme state
export const themeAtom = atom<"light" | "dark">("light");

// Language state
export const languageAtom = atom<string>("en");

// Loading states
export const isLoadingAtom = atom<boolean>(false);

// Form data state
export const formDataAtom = atom<any>(null);

// Selected menu item
export const selectedMenuAtom = atom<string>("home");

// Debug mode
export const debugModeAtom = atom<boolean>(false);

// Sidebar state
export const sidebarCollapsedAtom = atom<boolean>(false);
export const expandedGroupsAtom = atom<Set<string>>(new Set<string>());

// ReactFlow state management atoms - use Node[] for compatibility
export const nodesAtom = atom<WorkflowNode[]>([]);
export const edgesAtom = atom<Edge[]>([]);

// Layout configuration atom
export const layoutOptionsAtom = atom<LayoutOptions>({
  direction: "TB",
  nodeSpacing: 50,
  rankSpacing: 100,
});

// Selected node atom (id-based to avoid object-identity churn)
export const selectedNodeIdAtom = atom<string | null>(null);

export const registryStoreAtom = atom<Record<string, Validator>>({});

export const builderStoreAtom = atom<BuilderStore<
  typeof basicFormBuilder
> | null>(null);
export const interpreterStoreAtom = atom<InterpreterStore<
  typeof basicFormBuilder
> | null>(null);
export const runtimeApplicationAtom = atom<Application | undefined>(undefined);

export type ExpressionMasterDataCacheItem = {
  status: "idle" | "loading" | "loaded" | "error";
  records: DatasetRecord[];
  error?: string;
};
export const expressionMasterDataCacheAtom = atom<
  Record<string, ExpressionMasterDataCacheItem>
>({});

export const formSettingAtom = atom<FormSetting>({
  validation: {
    required: false,
    validators: [],
  },
  defaultLang: "en",
  translationLangs: [],
  labelTranslations: {},
});

// Attachment draft ID for file uploads during form filling
export const draftIdAtom = atom<string | null>(null);

export const activeEntityIdAtom = atom<string | null>(null);
export type ActiveSlotTarget = { entityId: string; slotIndex: number } | null;
export const activeSlotAtom = atom<ActiveSlotTarget>(null);
export const selectedGridHeaderAtom = atom<{
  entityId: string;
  headerKey: string;
  header: AttributeComponentProps<typeof gridHeaderAttribute>;
} | null>(null);

export const selectedApplicantAtom = atom<User | null>(null);
