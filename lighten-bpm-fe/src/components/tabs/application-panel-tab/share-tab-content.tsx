import ShareModal from "@/components/modals/share-modal";
import { PenIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { useModal } from "@/hooks/useModal";
import {
  useApplicationShares,
  useUpdateApplicationShares,
} from "@/hooks/usePermissions";
import { useUsers, useUsersByIds } from "@/hooks/useMasterData";
import { Application } from "@/types/application";
import {
  ApplicationShareInput,
  PermissionAction,
  PermissionGranteeType,
  PermissionItem,
} from "@/types/permission";
import { Avatar } from "@ui/avatar";
import { useMemo } from "react";
import { UserTile } from "../share-tab/user-tab-content";

type Props = {
  application: Application;
};
export default function ApplicationShare({ application }: Props) {
  const modal = useModal();
  const { shares, isLoading } = useApplicationShares(application.serialNumber);
  const userIds = useMemo(
    () => shares.map((share) => String(share.user_id)),
    [shares],
  );
  const { users } = useUsersByIds(userIds);
  const updateShares = useUpdateApplicationShares();

  const permissions = useMemo<PermissionItem[]>(
    () =>
      shares.map((share) => ({
        granteeType: PermissionGranteeType.USER,
        actions: [PermissionAction.USE],
        value: String(share.user_id),
      })),
    [shares],
  );

  const handleSave = async (next: PermissionItem[]) => {
    const payload: ApplicationShareInput[] = next.map((item) => ({
      user_id: Number(item.value),
      reason:
        shares.find((share) => String(share.user_id) === item.value)?.reason ??
        "",
    }));
    await updateShares.mutateAsync({
      serialNumber: application.serialNumber,
      shares: payload,
    });
  };

  const handleRemove = (userId: number) => {
    const payload: ApplicationShareInput[] = shares
      .filter((share) => share.user_id !== userId)
      .map((share) => ({
        user_id: share.user_id,
        reason: share.reason ?? "",
      }));
    updateShares.mutate({
      serialNumber: application.serialNumber,
      shares: payload,
    });
  };

  return (
    <div className="w-full h-full bg-white border-l border-stroke overflow-hidden">
      <div className="w-full inline-flex flex-col justify-start items-start">
        <div className="self-stretch h-14 px-5 bg-white inline-flex justify-start items-center gap-2">
          <div className="flex-1 flex justify-start items-center gap-2">
            <div className="justify-start text-gray-900 text-base font-semibold">
              Share this application
            </div>
          </div>
          <button
            type="button"
            className="w-6 h-6 flex items-center justify-center"
            onClick={() => modal.open()}
            aria-label="Share application"
          >
            <PenIcon className="text-secondary-text w-6 h-6" />
          </button>
        </div>
        <div className="self-stretch px-5 py-4 bg-gray-100 border-b border-stroke flex flex-col justify-start items-start gap-4">
          <div className="self-stretch flex flex-col justify-start items-start gap-2.5">
            <div className="self-stretch justify-start text-gray-900 text-base font-medium">
              Share list
            </div>
            <div className="self-stretch justify-start text-gray-500 text-sm font-medium">
              This form is visible to supervisors and approvers by default.
              <br />
              You may share access with other users.
            </div>
          </div>
          {!isLoading && shares.length === 0 && (
            <button
              className="text-lighten-blue underline underline-offset-2 font-medium"
              onClick={() => modal.open()}
            >
              Click here to configure.
            </button>
          )}
          {shares.length > 0 && (
            <div className="self-stretch bg-white rounded-lg border  border-stroke flex flex-col justify-start items-start overflow-hidden divide-y divide-stroke">
              {isLoading && (
                <div className="self-stretch px-5 py-3 text-gray-500 text-sm">
                  Loading...
                </div>
              )}

              {shares.map((share) => {
                const user = users.find(
                  (item) => String(item.id) === String(share.user_id),
                );
                const name = user?.name ?? "Unknown user";

                return (
                  <div
                    key={share.id}
                    className="self-stretch px-5 py-3 inline-flex justify-between items-center gap-4"
                  >
                    <UserTile
                      user={
                        user ?? {
                          id: String(share.user_id),
                          code: "",
                          name: "Unknown User",
                          email: "",
                          jobGrade: 0,
                          defaultOrgId: "",
                          defaultOrgCode: "",
                          isAdmin: false,
                          lang: "en",
                        }
                      }
                    />
                    <button
                      type="button"
                      className="w-6 h-6 flex items-center justify-center"
                      onClick={() => handleRemove(share.user_id)}
                      aria-label="Remove user"
                    >
                      <TrashIcon className="size-6 text-secondary-text" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <ShareModal
        {...modal}
        userPermissions={permissions}
        onSave={handleSave}
      />
    </div>
  );
}
