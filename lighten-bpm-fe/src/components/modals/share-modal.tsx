import { UseModalReturn } from "@/hooks/useModal";
import { Modal } from "../ui/modal";
import { PermissionItem } from "@/types/permission";
import ShareTab from "../tabs/share-tab";

type Props = UseModalReturn & {
  userPermissions: PermissionItem[];
  onSave: (permission: PermissionItem[]) => void;
};

export default function ShareModal(props: Props) {
  const { ...modalProps } = props;

  return (
    <Modal {...modalProps} size="lg" className="max-h-4/5">
      <ShareTab
        initialData={props.userPermissions}
        onCancel={() => modalProps.close()}
        onSave={(permission) => {
          props.onSave(permission);
          modalProps.close();
        }}
      />
    </Modal>
  );
}
