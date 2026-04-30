import {
  HomeIcon,
  FormManagementIcon,
  FlowEngineIcon,
  MasterDataIcon,
  MenuUserIcon,
  MenuRoleIcon,
  MenuOrgIcon,
  MenuValidationIcon,
} from "@/components/icons";
import { MenuItem } from "@/types/shared";

const enableAIFeature = import.meta.env.VITE_ENABLE_AIFEATURE === "true";

export const menuItems: MenuItem[] = [
  {
    key: "home",
    labelKey: "menu.home",
    path: "/dashboard",
    icon: HomeIcon,
  },
  {
    key: "form-management",
    labelKey: "menu.form_management",
    path: "/forms",
    icon: FormManagementIcon,
  },
  {
    key: "flow-engine",
    labelKey: "menu.flow_engine",
    path: "/workflow",
    icon: FlowEngineIcon,
  },
  ...(enableAIFeature
    ? [
        {
          key: "users",
          labelKey: "menu.users",
          path: "/admin/users",
          icon: MenuUserIcon,
        },
        {
          key: "organizations",
          labelKey: "menu.organizations",
          path: "/admin/organizations",
          icon: MenuOrgIcon,
        },
        {
          key: "roles",
          labelKey: "menu.roles",
          path: "/admin/roles",
          icon: MenuRoleIcon,
        },
        {
          key: "master-data",
          labelKey: "menu.master_data",
          path: "/master-data",
          icon: MasterDataIcon,
        },
        {
          key: "validation-registry",
          labelKey: "menu.validation_registry",
          path: "/validation-registry",
          icon: MenuValidationIcon,
        },
      ]
    : []),
];
