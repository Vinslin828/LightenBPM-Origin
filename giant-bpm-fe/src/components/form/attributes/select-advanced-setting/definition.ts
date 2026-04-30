import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export type SelectAdvancedSettingDetail = {
  entityId?: string;
  multipleSelection: boolean;
};

export const SELECT_ADVANCED_SETTING_EVENT = "select-advanced-setting-change";
export const getSelectAdvancedSettingEventName = (entityId?: string) =>
  `${SELECT_ADVANCED_SETTING_EVENT}-${entityId ?? "unknown"}`;

export const selectAdvancedSettingAttribute = createAttribute({
  name: "selectAdvancedSetting",
  validate(value) {
    return z
      .object({
        multipleSelection: z.boolean().default(false),
        searchInOptions: z.boolean().default(false),
      })
      .parse(value ?? {});
  },
});
