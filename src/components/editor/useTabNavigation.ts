import { useCallback, useRef, type RefObject } from 'react';

interface UseTabNavigationOptions {
  tabCount: number;
  activeIndex: number;
  onActivate: (index: number) => void;
}

interface UseTabNavigationReturn {
  handleTabKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  tabListRef: RefObject<HTMLDivElement | null>;
}

export function useTabNavigation({
  tabCount,
  activeIndex,
  onActivate,
}: UseTabNavigationOptions): UseTabNavigationReturn {
  const tabListRef = useRef<HTMLDivElement | null>(null);

  const focusTab = useCallback(
    (index: number) => {
      if (!tabListRef.current) return;
      const buttons =
        tabListRef.current.querySelectorAll<HTMLButtonElement>(
          '[role="tab"]',
        );
      if (buttons[index]) {
        buttons[index].focus();
        onActivate(index);
      }
    },
    [onActivate],
  );

  const handleTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      let newIndex = activeIndex;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          newIndex = (activeIndex + 1) % tabCount;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          newIndex = (activeIndex - 1 + tabCount) % tabCount;
          break;
        case 'Home':
          event.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          newIndex = tabCount - 1;
          break;
        default:
          return;
      }

      focusTab(newIndex);
    },
    [activeIndex, tabCount, focusTab],
  );

  return { handleTabKeyDown, tabListRef };
}
