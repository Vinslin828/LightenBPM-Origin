import { cn } from "@/utils/cn";
import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface ModalProps {
  isOpen: boolean;
  close: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  hasBackdrop?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

interface ModalHeaderProps {
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

const Modal = ({
  isOpen,
  close: onClose,
  children,
  size = "md",
  hasBackdrop = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = false,
  className = "",
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!hasBackdrop || !closeOnOverlayClick || !modalRef.current) {
      return;
    }

    if (!modalRef.current.contains(event.target as Node)) {
      onClose();
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "max-w-md";
      case "md":
        return "max-w-lg";
      case "lg":
        return "max-w-2xl";
      case "xl":
        return "max-w-4xl";
      case "full":
        return "max-w-full mx-4";
      default:
        return "max-w-lg";
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[100] overflow-y-auto transition-opacity duration-300 ease-out",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      {hasBackdrop && (
        <div
          className={cn(
            "fixed inset-0 bg-black/50 transition-opacity duration-300 ease-out",
            isOpen ? "opacity-100" : "opacity-0",
          )}
        />
      )}

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className={cn(
            "relative flex w-full max-h-[90dvh] flex-col overflow-hidden rounded-[20px] bg-white shadow-xl transition-all duration-300 ease-out",
            getSizeClasses(),
            isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0",
            className,
          )}
        >
          {/* Close button */}
          {showCloseButton && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
};

const ModalHeader = ({
  children,
  onClose,
  className = "",
}: ModalHeaderProps) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-6 border-b border-gray-200",
        className,
      )}
    >
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close modal"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

const ModalBody = ({ children, className = "" }: ModalBodyProps) => {
  return <div className={cn("p-6", className)}>{children}</div>;
};

const ModalFooter = ({ children, className = "" }: ModalFooterProps) => {
  return (
    <div
      className={cn(
        "flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50",
        className,
      )}
    >
      {children}
    </div>
  );
};

// Compound component exports
Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

export { Modal, ModalHeader, ModalBody, ModalFooter };
