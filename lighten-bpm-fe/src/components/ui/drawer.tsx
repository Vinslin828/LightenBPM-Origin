import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  closeOnBackdropClick?: boolean;
  hasBackdrop?: boolean;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  className,
  closeOnBackdropClick = true,
  hasBackdrop = true,
}: DrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      // Delay dialog.close() to allow exit animation
      const timeoutId = setTimeout(() => dialog.close(), 300);
      return () => clearTimeout(timeoutId);
    }

    const handleClose = () => {
      onClose();
    };

    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="drawer-title"
      className={cn(
        "fixed inset-0 size-auto max-h-none max-w-none overflow-hidden bg-transparent backdrop:bg-transparent",
        isOpen ? "animate-drawer-fade-in" : "animate-drawer-fade-out",
      )}
    >
      {/* Combined Backdrop and Container */}
      <div
        tabIndex={0}
        className={cn(
          "absolute inset-0 focus:outline-none",
          hasBackdrop && "bg-gray-500/75",
          isOpen ? "animate-backdrop-fade-in" : "animate-backdrop-fade-out",
        )}
        onClick={handleBackdropClick}
      >
        {/* Drawer Panel Container */}
        <div className="absolute inset-0 pl-10 sm:pl-16 pointer-events-none">
          {/* Drawer Panel */}
          <div
            className={cn(
              "group/dialog-panel relative ml-auto block size-full max-w-md transform pointer-events-auto",
              isOpen ? "animate-drawer-slide-in" : "animate-drawer-slide-out",
              className,
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <div
              className={cn(
                "absolute top-0 left-0 -ml-8 flex pt-4 pr-2 sm:-ml-10 sm:pr-4",
                isOpen
                  ? "animate-close-button-fade-in"
                  : "animate-close-button-fade-out",
              )}
            >
              <button
                type="button"
                onClick={onClose}
                className="relative rounded-md text-gray-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <span className="absolute -inset-2.5"></span>
                <span className="sr-only">Close panel</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                  className="size-6"
                >
                  <path
                    d="M6 18 18 6M6 6l12 12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="relative flex h-full flex-col overflow-y-auto bg-white shadow-xl">
              {title && (
                <div className="px-4 sm:px-6">
                  <h2
                    id="drawer-title"
                    className="text-base font-semibold text-gray-900"
                  >
                    {title}
                  </h2>
                </div>
              )}
              <div className="relative flex-1">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

// --- Bottom Sheet Drawer for Mobile ---

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
  closeOnBackdropClick?: boolean;
  hasBackdrop?: boolean;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  className,
  maxHeight = "80vh",
  closeOnBackdropClick = true,
  hasBackdrop = true,
}: BottomSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      const timeoutId = setTimeout(() => dialog.close(), 300);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      className={cn(
        "fixed inset-0 z-50 size-auto max-h-none max-w-none overflow-hidden bg-transparent p-0 backdrop:bg-transparent",
        isOpen ? "animate-drawer-fade-in" : "animate-drawer-fade-out",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 focus:outline-none",
          hasBackdrop && "bg-black/50",
          isOpen ? "animate-backdrop-fade-in" : "animate-backdrop-fade-out",
        )}
        onClick={handleBackdropClick}
      >
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 w-full transform transition-transform duration-300 ease-in-out pointer-events-auto overflow-y-auto",
            isOpen ? "translate-y-0" : "translate-y-full",
            className,
          )}
          style={{ maxHeight }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative flex h-full flex-col overflow-y-auto bg-white shadow-xl rounded-t-2xl overflow-clip">
            <div className="relative flex-1 rounded-t-2xl overflow-clip">
              {children}
            </div>
          </div>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

// Hook for managing drawer state
export function useDrawer(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}
