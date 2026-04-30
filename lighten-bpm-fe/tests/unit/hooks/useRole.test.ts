import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { IDomainService } from "@/interfaces/services";

// Mock the container module
const mockDomainService: Partial<IDomainService> = {
  getOrgRoles: vi.fn(),
  getOrgUnitById: vi.fn(),
  getOrgUnitMembers: vi.fn(),
  createRole: vi.fn(),
  updateOrgUnit: vi.fn(),
  deleteOrgUnit: vi.fn(),
  addUserToOrgUnit: vi.fn(),
  removeUserFromOrgUnit: vi.fn(),
};

vi.mock("@/container", () => ({
  container: {
    get: () => mockDomainService,
  },
}));

vi.mock("@/types/symbols", () => ({
  TYPES: { DomainService: Symbol.for("DomainService") },
}));

// Import hooks AFTER mocks are set up
const { useRoles, useRoleWithMembers, useCreateRole, useUpdateRole, useDeleteRole, useAddUserToRole, useRemoveUserFromRole } =
  await import("@/hooks/useRole");

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockRoles = [
  {
    id: "role-1",
    name: "Admin Role",
    code: "ADMIN",
    members: [{ id: "u1", name: "Alice", email: "alice@test.com", jobGrade: 1, defaultOrgId: "", defaultOrgCode: "", isAdmin: false }],
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  },
  {
    id: "role-2",
    name: "Editor Role",
    code: "EDITOR",
    members: [],
    createdAt: "2024-01-02",
    updatedAt: "2024-01-02",
  },
];

const mockUnit = {
  id: "role-1",
  name: "Admin Role",
  code: "ADMIN",
  members: [{ id: "u1", name: "Alice", email: "alice@test.com", jobGrade: 1, defaultOrgId: "", defaultOrgCode: "", isAdmin: false }],
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useRoles", () => {
  it("should fetch roles successfully", async () => {
    vi.mocked(mockDomainService.getOrgRoles!).mockResolvedValue({
      success: true,
      data: mockRoles,
    });

    const { result } = renderHook(() => useRoles(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.roles).toEqual(mockRoles);
    expect(result.current.error).toBeNull();
    expect(mockDomainService.getOrgRoles).toHaveBeenCalledOnce();
  });

  it("should return empty array when no roles", async () => {
    vi.mocked(mockDomainService.getOrgRoles!).mockResolvedValue({
      success: true,
      data: [],
    });

    const { result } = renderHook(() => useRoles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.roles).toEqual([]);
  });

  it("should handle fetch error", async () => {
    vi.mocked(mockDomainService.getOrgRoles!).mockRejectedValue(
      new Error("Network error"),
    );

    const { result } = renderHook(() => useRoles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});

describe("useRoleWithMembers", () => {
  it("should fetch role details and members", async () => {
    vi.mocked(mockDomainService.getOrgUnitById!).mockResolvedValue({
      success: true,
      data: mockUnit,
    });
    vi.mocked(mockDomainService.getOrgUnitMembers!).mockResolvedValue({
      success: true,
      data: mockUnit.members,
    });

    const { result } = renderHook(() => useRoleWithMembers("role-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.role).toBeDefined();
    expect(result.current.role!.id).toBe("role-1");
    expect(result.current.role!.name).toBe("Admin Role");
    expect(result.current.members).toHaveLength(1);
    expect(result.current.members[0].name).toBe("Alice");
  });

  it("should not fetch when id is undefined", () => {
    const { result } = renderHook(() => useRoleWithMembers(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.role).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(mockDomainService.getOrgUnitById).not.toHaveBeenCalled();
  });

  it("should deduplicate members", async () => {
    const dupeUser = { id: "u1", name: "Alice", email: "alice@test.com", jobGrade: 1, defaultOrgId: "", defaultOrgCode: "", isAdmin: false };
    vi.mocked(mockDomainService.getOrgUnitById!).mockResolvedValue({
      success: true,
      data: { ...mockUnit, members: [dupeUser, dupeUser] },
    });
    vi.mocked(mockDomainService.getOrgUnitMembers!).mockResolvedValue({
      success: false,
      data: undefined,
    });

    const { result } = renderHook(() => useRoleWithMembers("role-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.members).toHaveLength(1);
  });
});

describe("useCreateRole", () => {
  it("should create a role", async () => {
    vi.mocked(mockDomainService.createRole!).mockResolvedValue({
      success: true,
      data: { id: "role-3", name: "New Role", code: "NEW", members: [], createdAt: "", updatedAt: "" },
    });

    const { result } = renderHook(() => useCreateRole(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ code: "NEW", name: "New Role" });
    });

    expect(mockDomainService.createRole).toHaveBeenCalledWith({
      code: "NEW",
      name: "New Role",
    });
  });

  it("should throw on creation failure", async () => {
    vi.mocked(mockDomainService.createRole!).mockRejectedValue(
      new Error("Duplicate code"),
    );

    const { result } = renderHook(() => useCreateRole(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(() => result.current.mutateAsync({ code: "DUP", name: "Dup" })),
    ).rejects.toThrow("Duplicate code");
  });
});

describe("useUpdateRole", () => {
  it("should update role name and code", async () => {
    vi.mocked(mockDomainService.updateOrgUnit!).mockResolvedValue({
      success: true,
      data: { ...mockUnit, name: "Updated" },
    });

    const { result } = renderHook(() => useUpdateRole(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        roleId: "role-1",
        data: { name: "Updated", code: "ADMIN" },
      });
    });

    expect(mockDomainService.updateOrgUnit).toHaveBeenCalledWith("role-1", {
      name: "Updated",
      code: "ADMIN",
    });
  });
});

describe("useDeleteRole", () => {
  it("should delete a role", async () => {
    vi.mocked(mockDomainService.deleteOrgUnit!).mockResolvedValue({
      success: true,
      data: undefined,
    });

    const { result } = renderHook(() => useDeleteRole(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync("role-1");
    });

    expect(mockDomainService.deleteOrgUnit).toHaveBeenCalledWith("role-1");
  });
});

describe("useAddUserToRole", () => {
  it("should add a user to a role", async () => {
    vi.mocked(mockDomainService.addUserToOrgUnit!).mockResolvedValue({
      success: true,
      data: mockUnit,
    });

    const { result } = renderHook(() => useAddUserToRole(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ roleId: "role-1", userId: "u2" });
    });

    expect(mockDomainService.addUserToOrgUnit).toHaveBeenCalledWith(
      "role-1",
      "u2",
    );
  });
});

describe("useRemoveUserFromRole", () => {
  it("should remove a user from a role", async () => {
    vi.mocked(mockDomainService.removeUserFromOrgUnit!).mockResolvedValue({
      success: true,
      data: mockUnit,
    });

    const { result } = renderHook(() => useRemoveUserFromRole(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ roleId: "role-1", userId: "u1" });
    });

    expect(mockDomainService.removeUserFromOrgUnit).toHaveBeenCalledWith(
      "role-1",
      "u1",
    );
  });
});
