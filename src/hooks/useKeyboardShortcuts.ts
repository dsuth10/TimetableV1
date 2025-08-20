import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          !!event.ctrlKey === !!shortcut.ctrl &&
          !!event.shiftKey === !!shortcut.shift &&
          !!event.altKey === !!shortcut.alt &&
          !!event.metaKey === !!shortcut.meta
        ) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

// Common keyboard shortcuts
export const commonShortcuts = {
  // Navigation
  goHome: { key: 'h', ctrl: true, description: 'Go to home page' },
  goBack: { key: 'b', ctrl: true, description: 'Go back' },
  
  // Actions
  save: { key: 's', ctrl: true, description: 'Save' },
  delete: { key: 'Delete', description: 'Delete selected item' },
  refresh: { key: 'r', ctrl: true, description: 'Refresh' },
  
  // Search
  search: { key: 'f', ctrl: true, description: 'Search' },
  
  // Modals
  closeModal: { key: 'Escape', description: 'Close modal' },
  
  // Week navigation
  nextWeek: { key: 'ArrowRight', ctrl: true, description: 'Next week' },
  previousWeek: { key: 'ArrowLeft', ctrl: true, description: 'Previous week' },
  currentWeek: { key: 'Home', ctrl: true, description: 'Go to current week' },
};
