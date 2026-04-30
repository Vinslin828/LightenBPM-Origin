import * as React from "react";
import { cn } from "@/utils/cn";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircleIcon } from "../icons";

// --- TYPE DEFINITIONS ---

type ToastVariant = "default" | "success" | "destructive" | "warning";

interface ToastMessage {
  id: string;
  variant?: ToastVariant;
  title?: React.ReactNode;
  description?: React.ReactNode;
}

interface ToastContextType {
  toast: (props: Omit<ToastMessage, "id">) => void;
}

// --- CONTEXT AND PROVIDER ---

const ToastContext = React.createContext<ToastContextType | undefined>(
  undefined,
);

type ToastSubscriber = () => void;

let toastQueue: ToastMessage[] = [];
const toastSubscribers = new Set<ToastSubscriber>();

const emitToastChange = () => {
  toastSubscribers.forEach((listener) => listener());
};

const removeToast = (id: string) => {
  toastQueue = toastQueue.filter((toast) => toast.id !== id);
  emitToastChange();
};

const enqueueToast = ({
  title,
  description,
  variant = "default",
}: Omit<ToastMessage, "id">) => {
  const id = crypto.randomUUID();
  toastQueue = [...toastQueue, { id, title, description, variant }];
  emitToastChange();

  setTimeout(() => {
    removeToast(id);
  }, 5000);
};

const subscribeToToasts = (listener: ToastSubscriber) => {
  toastSubscribers.add(listener);
  return () => {
    toastSubscribers.delete(listener);
  };
};

const getToastSnapshot = () => toastQueue;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const contextValue = React.useMemo(() => ({ toast: enqueueToast }), []);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
};

// --- HOOK for easy access ---

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

// --- VISUAL COMPONENTS ---

const ToastViewport: React.FC = () => {
  const toasts = React.useSyncExternalStore(
    subscribeToToasts,
    getToastSnapshot,
    getToastSnapshot,
  );

  return (
    <div className="fixed top-0 left-1/2 z-[150] flex flex-col items-end p-4 w-full md:max-w-[420px] -translate-x-1/2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

const toastVariants = cva(
  "w-full flex items-center p-4 mb-4 text-gray-500 bg-white rounded-lg shadow-sm dark:text-gray-400 dark:bg-gray-800",
  {
    variants: {
      variant: {
        default: "border-blue-500",
        success: "border-green-500 bg-green-100",
        destructive: "border-red-500 bg-red-100",
        warning: "border-orange-500 bg-yellow-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

// --- Icon Components ---
const FireIcon = () => (
  <svg
    className="w-4 h-4"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 18 20"
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15.147 15.085a7.159 7.159 0 0 1-6.189 3.307A6.713 6.713 0 0 1 3.1 15.444c-2.679-4.513.287-8.737.888-9.548A4.373 4.373 0 0 0 5 1.608c1.287.953 6.445 3.218 5.537 10.5 1.5-1.122 2.706-3.01 2.853-6.14 1.433 1.049 3.993 5.395 1.757 9.117Z"
    />
  </svg>
);

const ErrorIcon = () => (
  <svg
    className="w-5 h-5"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 11.793a1 1 0 1 1-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 0 1-1.414-1.414L8.586 10 6.293 7.707a1 1 0 0 1 1.414-1.414L10 8.586l2.293-2.293a1 1 0 0 1 1.414 1.414L11.414 10l2.293 2.293Z" />
  </svg>
);

const WarningIcon = () => (
  <svg
    className="w-5 h-5"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM10 15a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm1-4a1 1 0 0 1-2 0V6a1 1 0 0 1 2 0v5Z" />
  </svg>
);

const variantIcons: Record<
  ToastVariant,
  { icon: React.ReactNode; className: string }
> = {
  default: {
    icon: <FireIcon />,
    className: "text-blue-500 bg-blue-100 dark:bg-blue-800 dark:text-blue-200",
  },
  success: {
    icon: <CheckCircleIcon />,
    className:
      "text-green-500 bg-green-100 dark:bg-green-800 dark:text-green-200",
  },
  destructive: {
    icon: <ErrorIcon />,
    className: "text-red-500 bg-red-100 dark:bg-red-800 dark:text-red-200",
  },
  warning: {
    icon: <WarningIcon />,
    className:
      "text-orange-500 bg-orange-100 dark:bg-orange-700 dark:text-orange-200",
  },
};

interface ToastComponentProps extends ToastMessage {
  onDismiss: () => void;
}

const Toast: React.FC<ToastComponentProps> = ({
  id,
  variant = "default",
  title,
  description,
  onDismiss,
}) => {
  const { icon, className: iconClassName } = variantIcons[variant];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={cn(toastVariants({ variant }))}
      role="alert"
    >
      <div
        className={cn(
          "inline-flex items-center justify-center shrink-0 w-8 h-8 rounded-lg",
          iconClassName,
        )}
      >
        {icon}
      </div>
      <div className="ms-3 text-sm font-normal">
        {title && <div className="text-dark">{title}</div>}
        {description && <div>{description}</div>}
      </div>
      <button
        type="button"
        className="ms-auto -mx-1.5 -my-1.5 text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700"
        onClick={onDismiss}
        aria-label="Close"
      >
        <span className="sr-only">Close</span>
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
};
