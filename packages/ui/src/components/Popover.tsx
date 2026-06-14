import React, { useState, useRef, useEffect, type ReactNode } from 'react';

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
  
  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen, placement, offset]);
  
  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (event: MouseEvent) => {
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
  
  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-block ${className}`}
        {...triggerProps}
      >
        {children}
      </div>
      
      {isOpen && (
        <>
          {/* Backdrop for mobile/touch devices */}
          <div 
            className="fixed inset-0 z-40 md:hidden" 
            onClick={handleClose}
          />
          
          {/* Popover content */}
          <div
            ref={contentRef}
            className={`fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg ${contentClassName}`}
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
