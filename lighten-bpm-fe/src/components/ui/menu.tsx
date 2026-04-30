import { cn } from "@/utils/cn";
import { ReactNode, useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

export function useMenu() {
  const [isOpen, setIsOpen] = useState(false);
  return {
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    isOpen,
    setIsOpen, // Added setIsOpen for direct control if needed
  };
}

export type MenuItem = {
  label: ReactNode;
  onClick: () => void;
  className?: string;
};

export type MenuProps = {
  items: MenuItem[];
  className?: string;
  disabled?: boolean;
  trigger: ReactNode; // The element that triggers the menu
};

export default function Menu({
  items,
  className,
  trigger,
  disabled = false,
}: MenuProps) {
  const { isOpen, setIsOpen } = useMenu();
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuContentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        menuContentRef.current &&
        !menuContentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  const menuContent = (
    <div
      ref={menuContentRef}
      style={{
        position: "absolute",
        top: `${position.top}px`,
        right: `${position.right}px`,
      }}
      className={cn(
        "mt-2 rounded-md bg-white shadow-sm border border-stroke w-48 z-50 overflow-clip",
        className,
      )}
    >
      <div className="flex flex-col justify-start items-start">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              item.onClick();
              setIsOpen(false); // Close menu after clicking an item
            }}
            className={cn(
              "w-full h-11 px-5 py-2.5 flex hover:bg-gray-2 items-center",
              item.className,
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div
        onClick={(e) => {
          if (disabled) return;
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        ref={triggerRef}
      >
        {trigger}
      </div>
      {isOpen && createPortal(menuContent, document.body)}
    </>
  );
}
