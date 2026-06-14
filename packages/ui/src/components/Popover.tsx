import React, { useState, useRef, useEffect, type ReactNode } from 'react';

/**
 * Click targets matching these selectors are treated as "inside" the popover,
 * so clicking them does not close it. Covers portaled overlays that live
 * outside contentRef in the DOM — Radix poppers, the autocomplete dropdown,
 * and an opt-in `[data-popover-ignore]` hook for custom roots.
 */
const POPOVER_IGNORE_SELECTORS =
  '[data-radix-popper-content-wrapper],[data-radix-portal],.dropdown,[data-popover-ignore]';

/** Enter/exit transition duration (ms). Must match the `duration-150` class. */
const TRANSITION_MS = 150;

export interface PopoverProps {
  children: ReactNode;
  content: ReactNode;
  trigger?: 'click' | 'hover';
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
  offset?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
}

export const Popover: React.FC<PopoverProps> = ({
  children,
  content,
  trigger = 'click',
  placement = 'bottom-start',
  offset = 8,
  open: controlledOpen,
  onOpenChange,
  className = '',
  contentClassName = '',
  disabled = false,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  // `mounted` keeps the content in the DOM through the exit transition;
  // `entered` is the transition target toggled a frame after mount.
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  
  const updatePosition = () => {
    if (!triggerRef.current || !contentRef.current) return;
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    
    let top = 0;
    let left = 0;
    
    switch (placement) {
      case 'top':
        top = triggerRect.top - contentRect.height - offset;
        left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
        break;
      case 'top-start':
        top = triggerRect.top - contentRect.height - offset;
        left = triggerRect.left;
        break;
      case 'top-end':
        top = triggerRect.top - contentRect.height - offset;
        left = triggerRect.right - contentRect.width;
        break;
      case 'bottom':
        top = triggerRect.bottom + offset;
        left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
        break;
      case 'bottom-start':
        top = triggerRect.bottom + offset;
        left = triggerRect.left;
        break;
      case 'bottom-end':
        top = triggerRect.bottom + offset;
        left = triggerRect.right - contentRect.width;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
        left = triggerRect.left - contentRect.width - offset;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
        left = triggerRect.right + offset;
        break;
    }
    
    // Adjust for viewport boundaries
    if (left < 0) left = 8;
    if (left + contentRect.width > viewport.width) {
      left = viewport.width - contentRect.width - 8;
    }
    if (top < 0) top = 8;
    if (top + contentRect.height > viewport.height) {
      top = viewport.height - contentRect.height - 8;
    }
    
    setPosition({ top, left });
  };
  
  const handleToggle = () => {
    if (disabled) return;
    const newOpen = !isOpen;
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };
  
  const handleClose = () => {
    if (controlledOpen === undefined) {
      setInternalOpen(false);
    }
    onOpenChange?.(false);
  };
  
  // Drive mount/unmount and the enter/exit transition off the logical open
  // state. On open: mount, then flip `entered` on the next frame so the browser
  // paints the "from" state first. On close: clear `entered` to animate out,
  // then unmount after the transition finishes.
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // Flip to the "entered" state a tick after mount so the browser paints
      // the "from" frame first and the transition runs. A timer (not rAF) is
      // used so it still fires when the tab is backgrounded/hidden.
      const t = setTimeout(() => setEntered(true), 20);
      return () => clearTimeout(t);
    }
    setEntered(false);
    const t = setTimeout(() => setMounted(false), TRANSITION_MS);
    return () => clearTimeout(t);
  }, [isOpen]);

  // Measure (and keep tracking) position once the content is actually mounted.
  useEffect(() => {
    if (mounted) {
      updatePosition();
      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();

      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
    return undefined;
  }, [mounted, placement, offset]);
  
  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element | null;
        // Keep open when the click lands inside a portaled overlay (e.g. an
        // autocomplete/select dropdown) rendered outside contentRef; otherwise
        // choosing an option would count as an outside click and close us.
        if (target?.closest?.(POPOVER_IGNORE_SELECTORS)) return;
        if (
          triggerRef.current &&
          contentRef.current &&
          !triggerRef.current.contains(event.target as Node) &&
          !contentRef.current.contains(event.target as Node)
        ) {
          handleClose();
        }
      };
      
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          handleClose();
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
    return undefined;
  }, [isOpen]);
  
  const triggerProps = {
    onClick: trigger === 'click' ? handleToggle : undefined,
    onMouseEnter: trigger === 'hover' ? () => handleToggle() : undefined,
    onMouseLeave: trigger === 'hover' ? () => handleClose() : undefined,
  };

  // The popover slides in from the trigger's side: a panel below the trigger
  // (bottom*) starts slightly up, one above (top*) starts slightly down, etc.
  // Literal classes only, so Tailwind's content scanner emits them.
  const enterOffsetClass = placement.startsWith('top')
    ? 'translate-y-1'
    : placement.startsWith('bottom')
      ? '-translate-y-1'
      : placement === 'left'
        ? 'translate-x-1'
        : '-translate-x-1';
  
  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-block ${className}`}
        {...triggerProps}
      >
        {children}
      </div>
      
      {mounted && (
        <>
          {/* Backdrop for mobile/touch devices */}
          <div
            className={`fixed inset-0 z-40 md:hidden transition-opacity duration-150 ease-out ${entered ? 'opacity-100' : 'opacity-0'}`}
            onClick={handleClose}
          />

          {/* Popover content — fades + slides in from the trigger's side.
              Only opacity/translate animate (not scale) so getBoundingClientRect
              width/height stay stable for positioning. */}
          <div
            ref={contentRef}
            className={`fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg transition duration-150 ease-out ${entered ? 'opacity-100 translate-x-0 translate-y-0' : `opacity-0 ${enterOffsetClass}`} ${contentClassName}`}
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
            }}
            onMouseEnter={trigger === 'hover' ? () => setInternalOpen(true) : undefined}
            onMouseLeave={trigger === 'hover' ? () => handleClose() : undefined}
          >
            {content}
          </div>
        </>
      )}
    </>
  );
};

export default Popover;
