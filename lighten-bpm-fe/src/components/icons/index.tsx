import { cn } from "@/utils/cn";
import { CSSProperties } from "react";

// Import all SVGs as React Components
import HomeIconRaw from "@/assets/icons/menu_home.svg?react";
import FormManagementIconRaw from "@/assets/icons/menu_form_management.svg?react";
import FlowEngineIconRaw from "@/assets/icons/menu_flow_engine.svg?react";
import MasterDataIconRaw from "@/assets/icons/menu_master_data.svg?react";
import MenuUserIconRaw from "@/assets/icons/menu_user.svg?react";
import MenuRoleIconRaw from "@/assets/icons/menu_role.svg?react";
import MenuOrgIconRaw from "@/assets/icons/menu_org.svg?react";
import MenuValidationIconRaw from "@/assets/icons/menu_validation.svg?react";
import ButtonIconRaw from "@/assets/icons/ic_button.svg?react";
import CheckboxIconRaw from "@/assets/icons/ic_checkbox.svg?react";
import DateTimeIconRaw from "@/assets/icons/ic_date_time.svg?react";
import DropdownIconRaw from "@/assets/icons/ic_dropdown.svg?react";
import FileUploadIconRaw from "@/assets/icons/ic_file_upload.svg?react";
import FileDownloadIconRaw from "@/assets/icons/ic_file_download.svg?react";
import DownloadIconRaw from "@/assets/icons/ic_download.svg?react";
import GridIconRaw from "@/assets/icons/ic_grid.svg?react";
import InputIconRaw from "@/assets/icons/ic_input.svg?react";
import NumberIconRaw from "@/assets/icons/ic_number.svg?react";
import RadioIconRaw from "@/assets/icons/ic_radio.svg?react";
import TextareaIconRaw from "@/assets/icons/ic_textarea.svg?react";
import ToggleIconRaw from "@/assets/icons/ic_toggle.svg?react";
import FlagIconRaw from "@/assets/icons/ic_flag.svg?react";
import BackIconRaw from "@/assets/icons/ic_back.svg?react";
import TrashIconRaw from "@/assets/icons/ic_trash.svg?react";
import EditIconRaw from "@/assets/icons/ic_edit.svg?react";
import CalendarIconRaw from "@/assets/icons/ic_calendar.svg?react";
import CirclePlusIconRaw from "@/assets/icons/ic_circle_plus.svg?react";
import PlusIconRaw from "@/assets/icons/ic_plus.svg?react";
import DragIndicatorIconRaw from "@/assets/icons/ic_drag_indicator.svg?react";
import ChevronUpIconRaw from "@/assets/icons/ic_chevron_up.svg?react";
import ConditionIconRaw from "@/assets/icons/ic_condition.svg?react";
import DeleteIconRaw from "@/assets/icons/ic_delete.svg?react";
import ApprovalIconRaw from "@/assets/icons/ic_approval.svg?react";
import FormIconRaw from "@/assets/icons/ic_form.svg?react";
import SubflowIconRaw from "@/assets/icons/ic_subflow.svg?react";
import SupervisorIconRaw from "@/assets/icons/ic_supervisor.svg?react";
import AndIconRaw from "@/assets/icons/ic_and.svg?react";
import OrIconRaw from "@/assets/icons/ic_or.svg?react";
import BellIconRaw from "@/assets/icons/ic_bell.svg?react";
import LogoRaw from "@/assets/logo.svg?react";
import CheckCircleIconRaw from "@/assets/icons/ic_checkmark_circle.svg?react";
import CrossCircleIconRaw from "@/assets/icons/ic_crossmark_circle.svg?react";
import SignIconRaw from "@/assets/icons/ic_sign.svg?react";
import ApproveIconRaw from "@/assets/icons/ic_approve.svg?react";
import SeparatorIconRaw from "@/assets/icons/ic_separator.svg?react";
import BranchIconRaw from "@/assets/icons/ic_branch.svg?react";
import DepartmentIconRaw from "@/assets/icons/ic_department.svg?react";
import PenIconRaw from "@/assets/icons/ic_pen.svg?react";
import ClearIconRaw from "@/assets/icons/ic_clear.svg?react";
import FilterIconRaw from "@/assets/icons/ic_filter.svg?react";
import CurrencyIconRaw from "@/assets/icons/ic_currency.svg?react";
import CopyIconRaw from "@/assets/icons/ic_copy.svg?react";
import CodeIconRaw from "@/assets/icons/ic_code.svg?react";
import ManualIconRaw from "@/assets/icons/ic_manual.svg?react";
import ExpressionIconRaw from "@/assets/icons/ic_expression.svg?react";
import SettingsIconRaw from "@/assets/icons/ic_settings.svg?react";
import LockIconRaw from "@/assets/icons/ic_lock.svg?react";
import UserIconRaw from "@/assets/icons/ic_user.svg?react";
import RoleIconRaw from "@/assets/icons/ic_role.svg?react";
import LinkIconRaw from "@/assets/icons/ic_link.svg?react";
import ArrowDownIconRaw from "@/assets/icons/ic_arrow_down.svg?react";
import CloseIconRaw from "@/assets/icons/ic_close.svg?react";
import FileIconRaw from "@/assets/icons/ic_file.svg?react";
import ContainerIconRaw from "@/assets/icons/ic_column.svg?react";
import AddButtonIconRaw from "@/assets/icons/btn_add.svg?react";
import StartIconRaw from "@/assets/icons/ic_start.svg?react";
import HideIconRaw from "@/assets/icons/ic_hide.svg?react";
import ExportIconRaw from "@/assets/icons/ic_export.svg?react";
import ImportIconRaw from "@/assets/icons/ic_import.svg?react";

interface IconProps {
  className?: string;
  style?: CSSProperties;
}

// --- Wrapper Components ---

const Logo = ({ className, style }: IconProps) => (
  <LogoRaw className={className} style={style} />
);

const HomeIcon = ({ className, style }: IconProps) => (
  <HomeIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const FormManagementIcon = ({ className, style }: IconProps) => (
  <FormManagementIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const FlowEngineIcon = ({ className, style }: IconProps) => (
  <FlowEngineIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const MasterDataIcon = ({ className, style }: IconProps) => (
  <MasterDataIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const MenuUserIcon = ({ className, style }: IconProps) => (
  <MenuUserIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const MenuRoleIcon = ({ className, style }: IconProps) => (
  <MenuRoleIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const MenuOrgIcon = ({ className, style }: IconProps) => (
  <MenuOrgIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const MenuValidationIcon = ({ className, style }: IconProps) => (
  <MenuValidationIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const ButtonIcon = ({ className, style }: IconProps) => (
  <ButtonIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const CheckboxIcon = ({ className, style }: IconProps) => (
  <CheckboxIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const DateTimeIcon = ({ className, style }: IconProps) => (
  <DateTimeIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const DropdownIcon = ({ className, style }: IconProps) => (
  <DropdownIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const FileUploadIcon = ({ className, style }: IconProps) => (
  <FileUploadIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const FileDownloadIcon = ({ className, style }: IconProps) => (
  <FileDownloadIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const DownloadIcon = ({ className, style }: IconProps) => (
  <DownloadIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const UrlIcon = ({ className, style }: IconProps) => (
  <LinkIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const GridIcon = ({ className, style }: IconProps) => (
  <GridIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const InputIcon = ({ className, style }: IconProps) => (
  <InputIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const NumberIcon = ({ className, style }: IconProps) => (
  <NumberIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const RadioIcon = ({ className, style }: IconProps) => (
  <RadioIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const TextareaIcon = ({ className, style }: IconProps) => (
  <TextareaIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const ToggleIcon = ({ className, style }: IconProps) => (
  <ToggleIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const FlagIcon = ({ className, style }: IconProps) => (
  <FlagIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const BackIcon = ({ className, style }: IconProps) => (
  <BackIconRaw className={cn("w-7 h-7", className)} style={style} />
);
const TrashIcon = ({ className, style }: IconProps) => (
  <TrashIconRaw className={cn("w-[14px] h-[14px]", className)} style={style} />
);
const CalendarIcon = ({ className, style }: IconProps) => (
  <CalendarIconRaw className={cn("w-4 h-4", className)} style={style} />
);
const CirclePlusIcon = ({ className, style }: IconProps) => (
  <CirclePlusIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const PlusIcon = ({ className, style }: IconProps) => (
  <PlusIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const DragIndicatorIcon = ({ className, style }: IconProps) => (
  <DragIndicatorIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const ChevronUpIcon = ({ className, style }: IconProps) => (
  <ChevronUpIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const ConditionIcon = ({ className, style }: IconProps) => (
  <ConditionIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const DeleteIcon = ({ className, style }: IconProps) => (
  <DeleteIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const ApprovalIcon = ({ className, style }: IconProps) => (
  <ApprovalIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const FormIcon = ({ className, style }: IconProps) => (
  <FormIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const SubflowIcon = ({ className, style }: IconProps) => (
  <SubflowIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const SupervisorIcon = ({ className, style }: IconProps) => (
  <SupervisorIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const AndIcon = ({ className, style }: IconProps) => (
  <AndIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const OrIcon = ({ className, style }: IconProps) => (
  <OrIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const BellIcon = ({ className, style }: IconProps) => (
  <BellIconRaw className={cn("w-6 h-6", className)} style={style} />
);

const CheckCircleIcon = ({ className, style }: IconProps) => (
  <CheckCircleIconRaw className={cn("w-6 h-6", className)} style={style} />
);

const CrossCircleIcon = ({ className, style }: IconProps) => (
  <CrossCircleIconRaw className={cn("w-6 h-6", className)} style={style} />
);

const SignIcon = ({ className, style }: IconProps) => (
  <SignIconRaw className={cn("w-6 h-6", className)} style={style} />
);

const ApproveIcon = ({ className, style }: IconProps) => (
  <ApproveIconRaw className={cn("w-6 h-6", className)} style={style} />
);

const SeparatorIcon = ({ className, style }: IconProps) => (
  <SeparatorIconRaw className={cn("w-6 h-6", className)} style={style} />
);

const BranchIcon = ({ className, style }: IconProps) => (
  <BranchIconRaw className={cn("w-6 h-6", className)} style={style} />
);

const DepartmentIcon = ({ className, style }: IconProps) => (
  <DepartmentIconRaw className={cn("w-5 h-6", className)} style={style} />
);
const PenIcon = ({ className, style }: IconProps) => (
  <PenIconRaw className={cn("w-6 h-6", className)} style={style} />
);

const FilterIcon = ({ className, style }: IconProps) => (
  <FilterIconRaw className={cn("w-6 h-6", className)} style={style} />
);

const ArrowDownIcon = ({ className, style }: IconProps) => (
  <ArrowDownIconRaw className={cn("w-6 h-6", className)} style={style} />
);

const CloseIcon = ({ className, style }: IconProps) => (
  <CloseIconRaw className={cn("w-5 h-5", className)} style={style} />
);

const FileIcon = ({ className, style }: IconProps) => (
  <FileIconRaw className={cn("w-6 h-6", className)} style={style} />
);

const ContainerIcon = ({ className, style }: IconProps) => (
  <ContainerIconRaw className={cn("w-6 h-6", className)} style={style} />
);

const AddButtonIcon = ({ className, style }: IconProps) => (
  <AddButtonIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const StartIcon = ({ className, style }: IconProps) => (
  <StartIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const HideIcon = ({ className, style }: IconProps) => (
  <HideIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const ExportIcon = ({ className, style }: IconProps) => (
  <ExportIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const ImportIcon = ({ className, style }: IconProps) => (
  <ImportIconRaw className={cn("w-6 h-6", className)} style={style} />
);

// --- Inline SVG Components (already stylable) ---

const GlobeIcon = ({ className, style }: IconProps) => (
  <svg
    className={cn("w-6 h-6", className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const AdminIcon = ({ className, style }: IconProps) => (
  <svg
    className={cn("w-6 h-6", className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    style={style}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4m0 0v4m0-4h4m-4 0H8m12 8H4a2 2 0 01-2-2V6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2z"
    />
  </svg>
);

const UsersIcon = ({ className, style }: IconProps) => (
  <svg
    className={cn("w-5 h-5", className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    style={style}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
    />
  </svg>
);

const RolesIcon = ({ className, style }: IconProps) => (
  <svg
    className={cn("w-5 h-5", className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    style={style}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const PermissionsIcon = ({ className, style }: IconProps) => (
  <svg
    className={cn("w-5 h-5", className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    style={style}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

const FormsReviewIcon = ({ className, style }: IconProps) => (
  <svg
    className={cn("w-5 h-5", className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    style={style}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const ChevronRightIcon = ({ className, style }: IconProps) => (
  <svg
    className={cn("w-4 h-4", className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    style={style}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5l7 7-7 7"
    />
  </svg>
);

const MenuIcon = ({ className, style }: IconProps) => (
  <svg
    className={cn("w-5 h-5", className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    style={style}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
    />
  </svg>
);

const LogoutIcon = ({ className, style }: IconProps) => (
  <svg
    className={cn("w-5 h-5", className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    style={style}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
    />
  </svg>
);

const EditIcon = ({ className, style }: IconProps) => (
  <EditIconRaw
    className={cn("w-6 h-6 stroke-secondary-text", className)}
    style={style}
  />
);

const ChevronLeftIcon = ({ className, style }: IconProps) => (
  <svg
    className={cn("w-6 h-6", className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    style={style}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 19l-7-7 7-7"
    />
  </svg>
);

const ClearIcon = ({ className, style }: IconProps) => (
  <ClearIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const CurrencyIcon = ({ className, style }: IconProps) => (
  <CurrencyIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const CopyIcon = ({ className, style }: IconProps) => (
  <CopyIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const CodeIcon = ({ className, style }: IconProps) => (
  <CodeIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const ManualIcon = ({ className, style }: IconProps) => (
  <ManualIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const ExpressionIcon = ({ className, style }: IconProps) => (
  <ExpressionIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const SettingsIcon = ({ className, style }: IconProps) => (
  <SettingsIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const LockIcon = ({ className, style }: IconProps) => (
  <LockIconRaw className={cn("w-6 h-6", className)} style={style} />
);
const UserIcon = ({ className, style }: IconProps) => (
  <UserIconRaw className={cn("w-5 h-5", className)} style={style} />
);
const RoleIcon = ({ className, style }: IconProps) => (
  <RoleIconRaw className={cn("w-5 h-5", className)} style={style} />
);

export {
  Logo,
  HomeIcon,
  FormManagementIcon,
  FlowEngineIcon,
  MasterDataIcon,
  MenuUserIcon,
  MenuRoleIcon,
  MenuOrgIcon,
  MenuValidationIcon,
  AdminIcon,
  UsersIcon,
  RolesIcon,
  PermissionsIcon,
  FormsReviewIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  MenuIcon,
  LogoutIcon,
  EditIcon,
  ButtonIcon,
  CheckboxIcon,
  DateTimeIcon,
  DropdownIcon,
  FileUploadIcon,
  FileDownloadIcon,
  DownloadIcon,
  GridIcon,
  InputIcon,
  NumberIcon,
  RadioIcon,
  TextareaIcon,
  ToggleIcon,
  FlagIcon,
  BackIcon,
  TrashIcon,
  CalendarIcon,
  CirclePlusIcon,
  PlusIcon,
  DragIndicatorIcon,
  ChevronUpIcon,
  ConditionIcon,
  DeleteIcon,
  ApprovalIcon,
  FormIcon,
  SubflowIcon,
  SupervisorIcon,
  AndIcon,
  OrIcon,
  BellIcon,
  CheckCircleIcon,
  CrossCircleIcon,
  SignIcon,
  ApproveIcon,
  SeparatorIcon,
  BranchIcon,
  DepartmentIcon,
  PenIcon,
  ClearIcon,
  FilterIcon,
  CurrencyIcon,
  CopyIcon,
  CodeIcon,
  ManualIcon,
  ExpressionIcon,
  SettingsIcon,
  LockIcon,
  UserIcon,
  RoleIcon,
  UrlIcon,
  ArrowDownIcon,
  CloseIcon,
  FileIcon,
  ContainerIcon,
  AddButtonIcon,
  StartIcon,
  HideIcon,
  ExportIcon,
  ImportIcon,
  GlobeIcon,
};
