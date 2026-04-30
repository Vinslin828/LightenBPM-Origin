import { UserIcon } from "@/components/icons";
import { useDebounce } from "@/hooks/useDebounce";
import { useOrgUnits } from "@/hooks/useMasterData";
import { Unit } from "@/types/domain";
import {
  PermissionAction,
  PermissionGranteeType,
  PermissionItem,
} from "@/types/permission";
import { cn } from "@/utils/cn";
import { Checkbox } from "@ui/checkbox";
import { Input } from "@ui/input";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Props = {
  data: PermissionItem[];
  onChange: (data: PermissionItem[]) => void;
};

type OrgUnitNode = Omit<Unit, "children"> & { children: OrgUnitNode[] };

export default function OrgTabContent({ data, onChange }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const { units, isLoading } = useOrgUnits(debouncedSearchQuery);

  const { roots, nodesWithChildren } = useMemo(() => {
    const map = new Map<string, OrgUnitNode>();
    (units ?? []).forEach((unit) => {
      const { children: _children, ...rest } = unit;
      map.set(unit.id, { ...rest, children: [] });
    });

    map.forEach((node) => {
      const parentId = node.parent?.id;
      if (parentId && map.has(parentId)) {
        map.get(parentId)?.children.push(node);
      }
    });

    const roots = Array.from(map.values()).filter((node) => {
      const parentId = node.parent?.id;
      return !parentId || !map.has(parentId);
    });

    const nodesWithChildren = Array.from(map.values()).filter(
      (node) => node.children.length > 0,
    );

    return { roots, nodesWithChildren };
  }, [units]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpandedIds((prev) => {
      if (prev.size) {
        return prev;
      }
      const next = new Set<string>();
      nodesWithChildren.forEach((node) => next.add(node.id));
      return next;
    });
  }, [nodesWithChildren]);

  function toggleUnit(checked: boolean, unitId: string) {
    if (checked) {
      onChange([
        ...data,
        {
          granteeType: PermissionGranteeType.ORG,
          actions: [PermissionAction.USE],
          value: unitId,
        } satisfies PermissionItem,
      ]);
    } else {
      onChange(data.filter((entry) => entry.value !== unitId));
    }
  }

  function toggleExpanded(unitId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  }

  const renderUnit = (unit: OrgUnitNode, level = 0) => {
    const hasChildren = unit.children.length > 0;
    const isExpanded = expandedIds.has(unit.id);
    const leftPadding = 12 + level * 34;

    return (
      <div key={unit.id} className="w-full">
        <div
          className="w-full min-w-0 pr-5 py-3 inline-flex justify-start items-center gap-2.5"
          style={{ paddingLeft: leftPadding }}
        >
          {hasChildren ? (
            <button
              type="button"
              className="w-6 h-6 rounded flex items-center justify-center"
              aria-label={isExpanded ? "Collapse" : "Expand"}
              onClick={() => toggleExpanded(unit.id)}
            >
              <ChevronDown
                className={cn("size-4 text-primary-text transition-transform", {
                  "rotate-180": isExpanded,
                })}
              />
            </button>
          ) : (
            <div className="w-6 h-6 rounded opacity-0" />
          )}
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <Checkbox
              id={unit.id}
              data-test-id={`permission-org-list-${unit.id}`}
              checked={!!data.find((entry) => entry.value === unit.id)}
              onCheckedChange={(checked) =>
                toggleUnit(Boolean(checked), unit.id)
              }
            />
            <div
              className="min-w-0 flex-1 truncate text-dark text-base font-medium"
              title={unit.name}
            >
              {unit.name}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <UserIcon className="text-primary-text" />
            <div className="justify-start text-primary-text text-xs">
              {unit.members?.length ?? 0}
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="w-full">
            {unit.children.map((child) => renderUnit(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Input
        placeholder="Search organization name"
        data-test-id="permission-org-search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
      />

      <div className="flex-1 min-h-0 w-full rounded-md border border-stroke inline-flex flex-col justify-start items-start overflow-y-auto divide-y divide-stroke">
        {isLoading && (
          <div className="py-10 text-primary-text mx-auto">loading...</div>
        )}
        {roots.map((unit) => renderUnit(unit))}
      </div>
    </>
  );
}
