import { UseModalReturn } from "@/hooks/useModal";
import { Modal } from "../ui/modal";
import PermissionTab from "../tabs/permission-tab";
import { Permission, PermissionTabKey } from "@/types/permission";
import { useState } from "react";

type Props = UseModalReturn & {
  permission: Permission;
  onSave: (permission: Permission) => void;
};

export default function PermissionModal(props: Props) {
  const { ...modalProps } = props;

  return (
    <Modal {...modalProps} size="lg" className="max-h-4/5">
      <PermissionTab
        initialData={props.permission}
        onCancel={() => modalProps.close()}
        onSave={(permission) => {
          props.onSave(permission);
          modalProps.close();
        }}
      />
    </Modal>
  );
}
