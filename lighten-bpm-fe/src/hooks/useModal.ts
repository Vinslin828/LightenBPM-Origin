import { useState, useCallback } from "react";

export interface UseModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Custom hook for managing modal state
 * @param initialState - Initial open state of the modal (default: false)
 * @returns Object with isOpen state and control functions
 */
export const useModal = (initialState = false): UseModalReturn => {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
};

/**
 * Custom hook for managing multiple modals
 * @param modalNames - Array of modal identifiers
 * @returns Object with modal states and control functions for each modal
 */
export const useModals = <T extends string>(modalNames: T[]) => {
  const [modals, setModals] = useState<Record<T, boolean>>(
    modalNames.reduce(
      (acc, name) => ({ ...acc, [name]: false }),
      {} as Record<T, boolean>,
    ),
  );

  const openModal = useCallback((modalName: T) => {
    setModals((prev) => ({ ...prev, [modalName]: true }));
  }, []);

  const closeModal = useCallback((modalName: T) => {
    setModals((prev) => ({ ...prev, [modalName]: false }));
  }, []);

  const toggleModal = useCallback((modalName: T) => {
    setModals((prev) => ({ ...prev, [modalName]: !prev[modalName] }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals((prev) =>
      Object.keys(prev).reduce(
        (acc, key) => ({ ...acc, [key]: false }),
        {} as Record<T, boolean>,
      ),
    );
  }, []);

  const isModalOpen = useCallback(
    (modalName: T) => {
      return modals[modalName];
    },
    [modals],
  );

  return {
    modals,
    openModal,
    closeModal,
    toggleModal,
    closeAllModals,
    isModalOpen,
  };
};
