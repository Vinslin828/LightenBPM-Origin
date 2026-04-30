import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Pagination from "@/components/ui/pagination";
import UserList from "@/components/user/UserList";
import UserDetailPanel from "@/components/user/UserDetailPanel";
import CreateUserModal from "@/components/user/CreateUserModal";
import { useUsersList, useCreateUser } from "@/hooks/useUser";
import { useToast } from "@/components/ui/toast";
import { useDebounce } from "@/hooks/useDebounce";

export const UsersPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { users, isLoading, error, pagination } = useUsersList({
    search: debouncedSearch || undefined,
    page,
    limit: pageSize,
  });
  const createUserMutation = useCreateUser();

  const handleCreateUser = async (data: {
    code: string;
    name: string;
    jobGrade: number;
    defaultOrgCode: string;
  }) => {
    try {
      await createUserMutation.mutateAsync(data);
      toast({ title: t("user_management.create_success") });
      setIsCreateModalOpen(false);
    } catch {
      toast({
        variant: "destructive",
        title: t("user_management.create_error"),
      });
      throw new Error(t("user_management.create_error"));
    }
  };

  return (
    <>
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateUser}
      />
      <div className="flex h-full bg-white">
        {/* Left Panel - User List */}
        <div className="flex-1 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="px-4 pt-3 pb-3 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-semibold text-gray-900">
                {t("user_management.title")}
              </h1>
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                {t("user_management.new_user")}
              </Button>
            </div>

            <div className="relative">
              <Input
                placeholder={t("user_management.search_placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="h-4 w-4" />}
                hasClearIcon
              />
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-0">
            {isLoading && (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">{t("common.loading")}</div>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center h-64 p-4">
                <div className="text-red-600 text-sm mb-2">
                  {t("user_management.load_error")}
                </div>
              </div>
            )}

            {!isLoading && !error && users && (
              <>
                {users.length === 0 && !debouncedSearch ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <div className="text-sm font-semibold">
                      {t("user_management.no_user")}
                    </div>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="text-blue-600 hover:text-blue-700 text-sm mt-1"
                    >
                      {t("user_management.empty_hint")}
                    </button>
                  </div>
                ) : (
                  <UserList
                    users={users}
                    selectedId={selectedUserId}
                    onSelect={setSelectedUserId}
                  />
                )}
              </>
            )}
          </div>

          {/* Pagination */}
          <Pagination
            totalPages={pagination?.totalPages}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>

        {/* Right Panel - User Details */}
        <div className="w-[400px] bg-white overflow-y-auto px-4 py-3">
          {selectedUserId ? (
            <UserDetailPanel
              userId={selectedUserId}
              onDelete={() => setSelectedUserId(undefined)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              {t("user_management.select_to_view")}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
