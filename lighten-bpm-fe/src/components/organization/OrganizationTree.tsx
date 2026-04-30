import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Plus, Users } from "lucide-react";
import { cn } from "@/utils/cn";
import { Unit } from "@/types/domain";

interface OrganizationTreeProps {
  units: Unit[];
  selectedId?: string;
  onSelect: (id: string) => void;
  searchQuery?: string;
  onAddSubOrg?: (parentUnit: Unit) => void;
}

interface TreeNodeProps {
  unit: Unit;
  level: number;
  selectedId?: string;
  onSelect: (id: string) => void;
  isSearchMatch: boolean;
  hasSearchMatchInChildren: boolean;
  onAddSubOrg?: (parentUnit: Unit) => void;
  searchQuery?: string;
}

/**
 * Recursively checks if a unit or any of its children match the search query
 * Searches in: unit name, code, and active head user name
 */
function hasMatchInSubtree(unit: Unit, query: string): boolean {
  if (!query) return true;

  const lowerQuery = query.toLowerCase();

  const headName = unit.heads?.[0]?.user.name;

  // Check if unit name, code, or head name matches
  const matchesCurrent =
    unit.name.toLowerCase().includes(lowerQuery) ||
    unit.code.toLowerCase().includes(lowerQuery) ||
    (headName?.toLowerCase().includes(lowerQuery) ?? false);

  if (matchesCurrent) return true;

  // Check children
  if (unit.children) {
    return unit.children.some((child) => {
      if (typeof child === "string") return false;
      return hasMatchInSubtree(child, query);
    });
  }

  return false;
}

/**
 * Tree node component with expand/collapse functionality
 */
function TreeNode({
  unit,
  level,
  selectedId,
  onSelect,
  isSearchMatch,
  hasSearchMatchInChildren,
  onAddSubOrg,
  searchQuery = "",
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren =
    unit.children &&
    unit.children.length > 0 &&
    unit.children.some((c) => typeof c !== "string");

  const isSelected = unit.id === selectedId;
  const lowerQuery = searchQuery.toLowerCase();

  // Don't render if no search match in this subtree
  if (!isSearchMatch && !hasSearchMatchInChildren) {
    return null;
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 rounded-md transition-colors group",
          isSelected && "bg-blue-50 border border-blue-300",
        )}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => onSelect(unit.id)}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-gray-200 rounded"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-600" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">
            {unit.name}
          </div>
          <div className="text-xs text-gray-500 truncate">{unit.code}</div>
        </div>
        <div className="flex items-center gap-2">
          {unit.heads?.[0]?.user.name && (
            <div
              className="text-xs text-gray-500 truncate max-w-[140px]"
              title={unit.heads[0].user.name}
            >
              {unit.heads[0].user.name}
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Users className="h-3 w-3" />
            {unit.members?.length || 0}
          </div>
          {onAddSubOrg && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddSubOrg(unit);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-blue-100 rounded text-blue-600"
              aria-label="Add sub organization"
              title="Add sub organization"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {unit.children!.map((child) => {
            if (typeof child === "string") return null;

            const childHeadName = child.heads?.[0]?.user.name;
            const childIsSearchMatch =
              child.name.toLowerCase().includes(lowerQuery) ||
              child.code.toLowerCase().includes(lowerQuery) ||
              (childHeadName?.toLowerCase().includes(lowerQuery) ?? false);

            return (
              <TreeNode
                key={child.id}
                unit={child}
                level={level + 1}
                selectedId={selectedId}
                onSelect={onSelect}
                isSearchMatch={childIsSearchMatch}
                hasSearchMatchInChildren={hasMatchInSubtree(child, searchQuery)}
                onAddSubOrg={onAddSubOrg}
                searchQuery={searchQuery}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Organization tree component with search and hierarchical display
 */
export default function OrganizationTree({
  units,
  selectedId,
  onSelect,
  searchQuery = "",
  onAddSubOrg,
}: OrganizationTreeProps) {
  // Build tree structure from flat list
  const tree = useMemo(() => {
    if (!units || units.length === 0) return [];

    try {
      // Find root units (units without parent)
      const roots = units.filter((unit) => !unit.parent);

      // Recursive function to build children
      const buildTree = (parentUnit: Unit): Unit => {
        const children = units.filter(
          (unit) => unit.parent?.id === parentUnit.id,
        );

        return {
          ...parentUnit,
          children: children.length > 0 ? children.map(buildTree) : undefined,
        };
      };

      return roots.map(buildTree);
    } catch (error) {
      console.error("Error building organization tree:", error);
      return [];
    }
  }, [units]);

  // Filter tree based on search query
  const filteredTree = useMemo(() => {
    if (!searchQuery) return tree;
    return tree.filter((unit) => hasMatchInSubtree(unit, searchQuery));
  }, [tree, searchQuery]);

  if (filteredTree.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        {searchQuery
          ? "No organizations match your search"
          : "No organizations found"}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {filteredTree.map((unit) => {
        const lowerQuery = searchQuery.toLowerCase();
        const headName = unit.heads?.[0]?.user.name;
        const isSearchMatch =
          unit.name.toLowerCase().includes(lowerQuery) ||
          unit.code.toLowerCase().includes(lowerQuery) ||
          (headName?.toLowerCase().includes(lowerQuery) ?? false);

        return (
          <TreeNode
            key={unit.id}
            unit={unit}
            level={0}
            selectedId={selectedId}
            onSelect={onSelect}
            isSearchMatch={isSearchMatch}
            hasSearchMatchInChildren={hasMatchInSubtree(unit, searchQuery)}
            onAddSubOrg={onAddSubOrg}
            searchQuery={searchQuery}
          />
        );
      })}
    </div>
  );
}
