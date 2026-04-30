"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/utils/cn";

type Props = {
  items: {
    name: React.ReactNode;
    content: React.ReactNode;
    key: string;
    contentClassName?: string;
  }[];
  className?: string;
  defaultOpenKey?: string[];
  onOpen?: (openKeys: string[]) => void;
  onClose?: (openKeys: string[]) => void;
  openKeys?: string[];
  disabled?: boolean;
  accordion?: boolean;
  showArrow?: boolean;
  defaultOpenAll?: boolean;
};

export default function Accordion(props: Props) {
  const {
    items,
    className,
    defaultOpenKey = [],
    openKeys: controlledOpenKeys,
    onOpen,
    onClose,
    accordion = false,
    disabled = false,
    showArrow = true,
    defaultOpenAll = true,
  } = props;

  const getInitialState = () => {
    if (defaultOpenAll) {
      return items.map((item) => item.key);
    }
    return defaultOpenKey;
  };

  const [uncontrolledOpenKeys, setUncontrolledOpenKeys] =
    React.useState(getInitialState);

  const isControlled = controlledOpenKeys !== undefined;
  const openKeys = isControlled ? controlledOpenKeys : uncontrolledOpenKeys;

  const handleToggle = (key: string) => {
    if (disabled) return;

    let newOpenKeys: string[];
    const isOpen = openKeys.includes(key);

    if (isOpen) {
      newOpenKeys = openKeys.filter((k) => k !== key);
      onClose?.(newOpenKeys);
    } else {
      if (accordion) {
        newOpenKeys = [key];
      } else {
        newOpenKeys = [...openKeys, key];
      }
      onOpen?.(newOpenKeys);
    }

    if (!isControlled) {
      setUncontrolledOpenKeys(newOpenKeys);
    }
  };

  return (
    <div
      id="accordion-collapse"
      data-accordion="collapse"
      className={className}
    >
      {items.map((item, index) => {
        const isOpen = openKeys.includes(item.key);
        const isLastItem = index === items.length - 1;

        const headingId = `accordion-collapse-heading-${item.key}`;
        const bodyId = `accordion-collapse-body-${item.key}`;

        return (
          <div key={item.key}>
            <h2 id={headingId} className="bg-white">
              <button
                type="button"
                className={cn(
                  "flex items-center justify-between w-full p-5 rtl:text-right text-dark font-semibold border border-stroke gap-3 cursor-pointer",
                )}
                onClick={() => handleToggle(item.key)}
                aria-expanded={isOpen}
                aria-controls={bodyId}
                disabled={disabled}
              >
                <span className="w-full flex flex-row items-start whitespace-nowrap">
                  {item.name}
                </span>
                {showArrow && (
                  <ChevronDown
                    className={cn(
                      "w-6 h-6 shrink-0 transition-transform duration-200 text-primary-text",
                      {
                        "rotate-180": isOpen,
                      },
                    )}
                  />
                )}
              </button>
            </h2>
            <div
              id={bodyId}
              className={cn("border border-t-0 border-gray-200 bg-gray-2", {
                hidden: !isOpen,
              })}
              aria-labelledby={headingId}
            >
              <div className={cn("p-5", item.contentClassName)}>
                {item.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
