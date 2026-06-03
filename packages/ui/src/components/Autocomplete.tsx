import type { AutocompleteProps, AutocompleteItem } from "./@types";
import type { ElementRef } from "react";

import { useState, useRef, useEffect, useMemo, forwardRef, useCallback } from 'react';
import { Search, X, Check, ChevronDown, AlertCircle } from 'lucide-react';
import { Text, Box } from '@radix-ui/themes';
import { cn } from "../util/utils";

const AutocompleteBase = forwardRef<
  ElementRef<"button">,
  AutocompleteProps & { onChange?: (value: string) => void }
>(({ 
  label,
  placeholder = "Select an option...",
  helperText,
  error = false,
  errorMessage,
  variant = "surface",
  size = "2",
  radius = "medium",
  items = [],
  value,
  onValueChange,
  onChange,
  onBlur,
  maxResults = 8,
  className,
  ...props
}, ref) => {
  const hasError = useMemo(() => error || !!errorMessage, [error, errorMessage]);
  const displayHelperText = hasError ? errorMessage : helperText;
  
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [focusedGroup, setFocusedGroup] = useState('');
  const [listboxId] = useState(() => `listbox-${Math.random().toString(36).substr(2, 9)}`);
  const [dropdownStyles, setDropdownStyles] = useState<React.CSSProperties>({});
  
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle both onChange (from form) and onValueChange (direct usage)
  const handleValueChange = useCallback((newValue: string) => {
    onValueChange?.(newValue);
    onChange?.(newValue);
  }, [onValueChange, onChange]);

  const selectedItem = items.find(item => item.id === value);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items.filter(item => !item.disabled).slice(0, maxResults);
    
    return items
      .filter(item => 
        !item.disabled && (
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
        )
      )
      .slice(0, maxResults);
  }, [query, items, maxResults]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    filteredItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  const flatItems = useMemo(() => {
    return Object.values(groupedItems).flat();
  }, [groupedItems]);

  const handleSelect = useCallback((item: AutocompleteItem) => {
    handleValueChange(item.id);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    if (onBlur) onBlur();
  }, [handleValueChange, onBlur]);

  const clearSelection = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    handleValueChange('');
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
  }, [handleValueChange]);

  const openDropdown = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 280; // max-h-64 + padding
      
      const shouldShowAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      
      // Calculate positioning for fixed dropdown
      const styles: React.CSSProperties = {
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        zIndex: 50,
      };
      
      if (shouldShowAbove) {
        styles.bottom = window.innerHeight - rect.top + 4; // 4px gap
      } else {
        styles.top = rect.bottom + 4; // 4px gap
      }
      
      setDropdownStyles(styles);
    }
    
    setIsOpen(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < flatItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : flatItems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && flatItems[selectedIndex] && !flatItems[selectedIndex].disabled) {
          handleSelect(flatItems[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        triggerRef.current?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  }, [isOpen, selectedIndex, flatItems, handleSelect, openDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target) &&
          triggerRef.current && !triggerRef.current.contains(target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
        if (onBlur) onBlur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onBlur]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  useEffect(() => {
    if (selectedIndex >= 0 && flatItems[selectedIndex]) {
      setFocusedGroup(flatItems[selectedIndex].category);
    }
  }, [selectedIndex, flatItems]);

  // Update dropdown position on scroll/resize
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = 280;
        
        const shouldShowAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
        
        const styles: React.CSSProperties = {
          position: 'fixed',
          left: rect.left,
          width: rect.width,
          zIndex: 50,
        };
        
        if (shouldShowAbove) {
          styles.bottom = window.innerHeight - rect.top + 4;
        } else {
          styles.top = rect.bottom + 4;
        }
        
        setDropdownStyles(styles);
      }
    };

    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  return (
    <Box className="w-full">
      {label && (
        <Text as="label" size="2" weight="medium" className="block mb-1">
          {label}
        </Text>
      )}

      <div className="relative" ref={dropdownRef}>
        <button
          ref={ref || triggerRef}
          onClick={openDropdown}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full flex items-center justify-between px-4 text-sm h-[40px]",
            "bg-white border rounded-lg shadow-sm transition-all duration-200",
            // "text-left group focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "text-left focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            hasError
              ? "border-red-300 hover:border-red-400"
              : "border-gray-300 hover:border-gray-400",
            className
          )}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={isOpen ? listboxId : undefined}
          aria-describedby={displayHelperText ? 'autocomplete-helper' : undefined}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-activedescendant={selectedIndex >= 0 ? `${listboxId}-${flatItems[selectedIndex]?.id}` : undefined}
          {...props}
          {...(hasError && { 'data-error': 'true' })}
        >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className={`truncate ${!selectedItem ? 'text-gray-400' : 'text-gray-900'}`}>
            {selectedItem ? selectedItem.label : placeholder}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {selectedItem && (
            <button
              onClick={clearSelection}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Clear selection"
              tabIndex={-1}
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          )}
          <ChevronDown 
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </div>
      </button>

        {displayHelperText && (
          <Text
            size="1"
            id="autocomplete-helper"
            className={cn(
              "block mt-1",
              hasError ? "text-red-500" : "text-gray-600"
            )}
          >
            {hasError && <AlertCircle className="inline h-3 w-3 mr-1" />}
            {displayHelperText}
          </Text>
        )}
      </div>

      {isOpen && (
        <div 
          style={dropdownStyles}
          className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden animate-in duration-200"
        >
          <div className="flex items-center border-b border-gray-100 px-3">
            <Search className="h-4 w-4 text-gray-400 mr-2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Type to search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 py-2 text-sm bg-transparent border-none outline-none
                         placeholder:text-gray-400"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-3 w-3 text-gray-400" />
              </button>
            )}
          </div>

          <div 
            id={listboxId}
            className="max-h-64 overflow-auto py-1" 
            role="listbox" 
            aria-label="Autocomplete options"
          >
            {filteredItems.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                No results found{query && ` for "${query}"`}
              </div>
            ) : (
              Object.entries(groupedItems).map(([category, categoryItems]) => (
                <div key={category}>
                  <div className={`px-3 py-1 text-xs font-medium uppercase tracking-wider transition-colors ${
                    focusedGroup === category ? 'text-blue-600 bg-blue-50' : 'text-gray-500'
                  }`}>
                    {category}
                  </div>
                  {categoryItems.map((item) => {
                    const globalIndex = flatItems.findIndex((i) => i.id === item.id);
                    const isSelected = selectedIndex === globalIndex;
                    const isCurrent = value === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        id={`${listboxId}-${item.id}`}
                        onClick={() => handleSelect(item)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm
                                   text-left transition-colors ${
                          item.disabled
                            ? 'text-gray-400 cursor-not-allowed'
                            : isSelected
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        role="option"
                        aria-selected={isCurrent}
                        data-focused={isSelected}
                        disabled={item.disabled}
                      >
                        <span className="font-medium truncate">{item.label}</span>
                        {isCurrent && (
                          <Check className="h-4 w-4 text-blue-600 ml-2 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Box>
  );
});

AutocompleteBase.displayName = "Autocomplete";

// const Autocomplete = withTheam(AutocompleteBase);

export { AutocompleteBase  };