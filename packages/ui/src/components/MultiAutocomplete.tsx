import {
	forwardRef,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
	type ElementRef
} from "react";
import type { MultiAutocompleteProps, Obs } from "./@types";
import { Box, Text } from "@radix-ui/themes";
import { cn } from "../util/utils";
import { AlertCircle, Check, ChevronDown, Search, X } from "lucide-react";
import { useCore } from "./core/context";
import { debounce, distinct, interval, Subject, switchMap } from "rxjs";
import { isEmpty } from "lodash";
import { useObservableCleanup } from "../hooks";
import { ConditionExpression } from "./core/expression";
import { useData } from "./context/DataProvider";
import { OptionRow, matchesOptionQuery, resolveIcon, resolveItemAvatar, resolveItemIcon, resolveItemSubtitle } from "./OptionRow";
import { OptionSearch, OPTION_SEARCH_HEIGHT } from "./OptionSearch";

const createMultiAutocomplete = <T extends Record<string, any>>() => {
	return forwardRef<
		ElementRef<"button">,
		MultiAutocompleteProps<T> & { onChange?: (values: string[]) => void }
	>(({
		label,
		subtitle,
		name,
		placeholder,
		inputIcon,
		itemIcon,
		itemSubtitle,
		itemAvatar,
		options,
		searchKey,
		idKey,
		displayKey,
		values = [],
		helperText,
		error,
		errorMessage,
		maxResults,
		maxHeight = 280,
		className,
		canObserve,
		observeTo,
		api,
		apiInfo,
		enabledWhen,
		maxSelections,
		showSelectedCount = true,
		onValuesChange,
		onChange,
		onBlur,
		fields,
		append,
		remove,
		...props
	}, ref) => {

		const { addObserveTable, getObserveTable: getDataValue } = useCore()

		const [items, setItems] = useState(options ?? [])
		const [listboxId] = useState(() => `listbox-${Math.random().toString(36).substr(2, 9)}`);
		const [isOpen, setIsOpen] = useState(false)
		const [dropdownStyles, setDropdownStyles] = useState<CSSProperties>({});
		const [dropdownListMaxHeight, setDropdownListMaxHeight] = useState(256);
		const [selectedIndex, setSelectedIndex] = useState(-1);
		const [query, setQuery] = useState('');
		const [triggerElement, setTriggerElement] = useState<HTMLButtonElement | null>(null);
		const [observeData, setObserveData] = useState<unknown>();
		const [internalValues, setInternalValues] = useState<string[]>(values);
		const [isObserveEnabled, setIsObserveEnabled] = useState(true);

		const dropdownRef = useRef<HTMLDivElement>(null);
		const dropdownContainerRef = useRef<HTMLDivElement>(null);
		const searchInputRef = useRef<HTMLInputElement>(null);

		const setTriggerButtonRef = useCallback((node: HTMLButtonElement | null) => {
			setTriggerElement(node);

			if (typeof ref === "function") {
				ref(node);
				return;
			}

			if (ref) {
				(ref as { current: HTMLButtonElement | null }).current = node;
			}
		}, [ref]);

		const subject = useMemo(() => new Subject<string>(), [])

		const filteredItems = useMemo(() => {
			if (!query.trim()) return items;

			return items.filter(item => matchesOptionQuery(item, query, searchKey, itemSubtitle))
		}, [query, items, searchKey, itemSubtitle])

		const hasError = useMemo(() => error && !!errorMessage, [error, errorMessage]);
		const displayHelperText = useMemo(() => hasError ? errorMessage : helperText, [hasError, errorMessage, helperText]);
		const selectedItems = useMemo(() =>
			items.filter(item => internalValues.includes(String(item[idKey]))),
			[items, internalValues, idKey]
		);

		const fetchData = useCallback((text: string) => {
			const q = Object.entries(apiInfo?.query ?? {}).reduce((acc, [key, value]) => {
				// Same as Autocomplete2: a `value` entry with no literal carries the typed text.
				return { ...acc, [key]: value.type === "value" ? (value.value !== undefined ? value.value : text) : undefined }
			}, {})
			if (observeTo !== "") {
				if (!isEmpty(apiInfo?.params)) {
					if (!isEmpty(observeData)) {
						const p = Object.entries(apiInfo?.params ?? {}).reduce((acc, [key, value]) => {
							return { ...acc, [key]: value.type === "observe" ? observeData : value.type === "value" ? text : value }
						}, {})

						return api && api({ ...q }, {
							...p
						})
					}
				}
			} else {
				return api && api({ ...q }, {})
			}
			return undefined
		}, [observeTo, observeData, api, apiInfo]);

		const apiSearch = useMemo(() => {
			if (api && apiInfo?.query) {
				return subject.pipe(
					debounce(() => interval(500)),
					distinct(),
					switchMap(async (text) => {
						return Promise.resolve(fetchData(text))
					}),
				)
			} else return undefined
		}, [subject, apiInfo, fetchData, observeData])

		const { contextData: ctx } = useData()

		useObservableCleanup(
			enabledWhen ? getDataValue({ key: (enabledWhen.left as Obs).key, type: "observe" }) : null,
			(data: unknown) => {
				if (enabledWhen) {
					const result = (!(new ConditionExpression(ctx).expression({ ...enabledWhen, left: { val: data } })));
					setIsObserveEnabled(result)
				}
			},
			[enabledWhen, ctx]
		)

		const handleValuesChange = useCallback((newValues: string[]) => {
			setInternalValues(newValues);
			onValuesChange?.(newValues);
			onChange?.(newValues);
			if (canObserve && name) {
				getDataValue({ key: name, type: "observe" })?.next(newValues)
			}
		}, [onValuesChange, onChange, canObserve, name, getDataValue])

		const handleSelect = useCallback((item: T) => {
			const itemId = String(item[idKey]);
			const isSelected = internalValues.includes(itemId);

			if (isSelected) {
				// Remove item if already selected
				const newValues = internalValues.filter(v => v !== itemId);
				handleValuesChange(newValues);
			} else {
				// Add item if not selected and within max limit
				if (!maxSelections || internalValues.length < maxSelections) {
					const newValues = [...internalValues, itemId];
					handleValuesChange(newValues);
				}
			}

			setQuery('');
			setSelectedIndex(-1);
			// Don't close dropdown for multi-selection
		}, [handleValuesChange, internalValues, idKey, maxSelections, append])

		const handleRemoveSelected = useCallback((itemId: string, e: React.MouseEvent) => {
			e.stopPropagation();
			const newValues = internalValues.filter(v => v !== itemId);
			const index = fields?.findIndex(f => f.id === itemId);
			index && remove?.(index)
			handleValuesChange(newValues);
		}, [internalValues, handleValuesChange])

		const updateDropdownPosition = useCallback(() => {
			const triggerEl = triggerElement ?? dropdownRef.current;
			if (!triggerEl) return;
			if (typeof window === "undefined") return;

			const rect = triggerEl.getBoundingClientRect();
			const modalContent = triggerEl.closest(".modal-content") as HTMLElement | null;
			const modalRect = modalContent?.getBoundingClientRect() ?? null;
			const boundaryTop = modalRect?.top ?? 0;
			const boundaryBottom = modalRect?.bottom ?? window.innerHeight;

			const viewportPadding = 8;
			const triggerGap = 4;
			const dropdownHeaderHeight = OPTION_SEARCH_HEIGHT;
			const preferredListHeight = typeof maxHeight === "number" ? Math.max(120, maxHeight - dropdownHeaderHeight) : 236;
			const minListHeight = 80;
			const estimatedDropdownHeight = dropdownHeaderHeight + preferredListHeight;

			const spaceBelow = boundaryBottom - rect.bottom - triggerGap - viewportPadding;
			const spaceAbove = rect.top - boundaryTop - triggerGap - viewportPadding;
			const shouldShowAbove = spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow;
			const availableListSpace = (shouldShowAbove ? spaceAbove : spaceBelow) - dropdownHeaderHeight;

			const computedListHeight = Math.max(
				minListHeight,
				Math.min(preferredListHeight, availableListSpace)
			);

			// `.modal-content` uses transform/backdrop-filter, which makes it the
			// containing block for position: fixed descendants. Coordinates must
			// then be relative to the modal box instead of the viewport.
			const styles: CSSProperties = {
				position: "fixed",
				left: rect.left - (modalRect?.left ?? 0),
				width: rect.width,
				zIndex: 100000,
			};

			if (shouldShowAbove) {
				styles.bottom = (modalRect?.bottom ?? window.innerHeight) - rect.top + triggerGap;
			} else {
				styles.top = rect.bottom - (modalRect?.top ?? 0) + triggerGap;
			}

			setDropdownStyles(styles);
			setDropdownListMaxHeight(computedListHeight);
		}, [maxHeight, triggerElement]);

		const openDropdown = useCallback(() => {
			if (!isOpen) {
				updateDropdownPosition();
			}
			setIsOpen(prev => !prev);
			setTimeout(() => {
				searchInputRef.current?.focus();
			}, 0)
		}, [updateDropdownPosition, isOpen]);

		const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
			if (!isOpen) {
				if (['Enter', 'ArrowDown'].includes(e.key)) {
					e.preventDefault();
					openDropdown();
				}
				return;
			}

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault();
					setSelectedIndex(prev => prev < filteredItems.length - 1 ? prev + 1 : 0);
					break;
				case 'ArrowUp':
					e.preventDefault();
					setSelectedIndex(prev => prev > 0 ? prev - 1 : filteredItems.length - 1);
					break;
				case 'Enter':
					e.preventDefault();
					if (selectedIndex >= 0 && filteredItems[selectedIndex]) {
						handleSelect(filteredItems[selectedIndex])
					}
					break;
				case 'Escape':
					setIsOpen(false);
					setSelectedIndex(-1);
					triggerElement?.focus();
					break;
				case 'Tab':
					setIsOpen(false);
					break;
			}
		}, [isOpen, openDropdown, selectedIndex, filteredItems, handleSelect, triggerElement]);

		// Handle click outside
		useEffect(() => {
			const handleClickOutside = (event: MouseEvent) => {
				const target = event.target as Node;

				// Check if click is outside both the trigger button and dropdown
				const isOutsideTrigger = triggerElement && !triggerElement.contains(target);
				const isOutsideDropdown = dropdownContainerRef.current && !dropdownContainerRef.current.contains(target);

				if (isOpen && isOutsideTrigger && isOutsideDropdown) {
					setIsOpen(false);
					setQuery('');
					setSelectedIndex(-1);
				}
			};

			if (isOpen) {
				document.addEventListener('mousedown', handleClickOutside);
			}

			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
			};
		}, [isOpen, triggerElement]);

		useEffect(() => {
			if (!isOpen) return;

			const handleScroll = () => updateDropdownPosition();
			const handleResize = () => updateDropdownPosition();

			updateDropdownPosition();

			window.addEventListener("scroll", handleScroll, true);
			window.addEventListener("resize", handleResize);

			return () => {
				window.removeEventListener("scroll", handleScroll, true);
				window.removeEventListener("resize", handleResize);
			};
		}, [isOpen, updateDropdownPosition]);

		useEffect(() => setSelectedIndex(-1), [query])

		useEffect(() => {
			canObserve && name && addObserveTable(name);
		}, [canObserve, name, addObserveTable]);

		// Sync internal state with prop changes
		// useEffect(() => {
		// 	setInternalValues(values);
		// }, [values]);

		useObservableCleanup(
			observeTo ? getDataValue({ key: observeTo, type: "observe" }) : null,
			(data: unknown) => {
				setInternalValues([])
				onChange?.([] as any)
				onValuesChange?.([] as any)
				setObserveData(data)
			},
			[observeTo, onChange, onValuesChange]
		)

		const getItems = useCallback((res: any) => {
			let data = res
			apiInfo?.paths?.forEach((path) => {
				data = data[path]
			})
			return data ?? []
		}, [apiInfo])

		useEffect(() => {
			fetchData("")?.then((res) => {
				setItems(getItems(res))
			});
		}, [observeData])

		useEffect(() => {
			if (!apiInfo?.query) {
				const result = fetchData("");
				if (result) {
					result.then((res) => setItems(getItems(res)));
				}
				return
			}
		}, [apiInfo?.query, fetchData, getItems, observeData]);

		useObservableCleanup(
			apiSearch,
			(res) => {
				setItems(getItems(res))
			},
			[getItems]
		);

		const displayText = useMemo(() => {
			if (selectedItems.length === 0) {
				return placeholder || "Select items...";
			}

			// Always show placeholder text when items are selected and showSelectedCount is true
			if (showSelectedCount) {
				return placeholder || "Select items...";
			}

			return placeholder || "Select items...";
		}, [selectedItems, displayKey, placeholder, showSelectedCount]);

		const isMaxReached = maxSelections ? internalValues.length >= maxSelections : false;
		const InputIconComponent = resolveIcon(inputIcon) ?? Search;
		const maxChips = showSelectedCount ? 10 : 6;

		return <Box className="w-full" >
			{
				label && (
					<Text as="label" size="2" weight="medium" className="block mb-1">
						{label}
						{maxSelections && (
							<span className="text-gray-500 dark:text-gray-400 ml-1">({internalValues.length}/{maxSelections})</span>
						)}
					</Text>
				)
			}
			{
				subtitle && (
					<Text size="1" className="block mb-1 text-gray-600 dark:text-gray-400">
						{subtitle}
					</Text>
				)
			}
			<div className="relative mb-2" ref={dropdownRef}>
				<button
					ref={setTriggerButtonRef}
					onClick={openDropdown}
					disabled={!isObserveEnabled}
					className={cn("w-full min-h-[40px] px-4 py-2 text-sm flex items-center justify-between",
						"bg-white dark:bg-gray-900 border rounded-md shadow-sm transition-all duration-200",
						"text-left focus:ring-2 focus:ring-[var(--accent-8,#3b82f6)] focus:border-transparent",
						hasError
							? "border-red-300 hover:border-red-400"
							: "border-gray-300 dark:border-gray-600 hover:border-gray-400",
							className,)}
					data-error={String(hasError)}
					{...props}
				>
					<div className="flex flex-1 min-w-0 items-center gap-3">
						<InputIconComponent className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
						<div className="flex-1 min-w-0">
							{selectedItems.length > 0 && (
								<div className="flex flex-wrap gap-1 mb-1 max-h-24 overflow-y-auto">
									{selectedItems.slice(0, maxChips).map((item) => (
										<span
											key={item[idKey]}
											className="flex items-center justify-between gap-1 px-2 py-1 bg-[var(--accent-3,#dbeafe)] text-[var(--accent-12,#1e40af)] text-xs rounded-md max-w-[120px] border border-[var(--accent-6,#bfdbfe)]"
										>
											<span className="truncate">{item[displayKey]}</span>
											<button
												type="button"
												onClick={(e) => handleRemoveSelected(String(item[idKey]), e)}
												className="hover:bg-[var(--accent-4,#bfdbfe)] rounded-full p-0.5 flex-shrink-0"
											>
												<X className="h-3 w-3" />
											</button>
										</span>
									))}
									{selectedItems.length > maxChips && (
										<span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
											+{selectedItems.length - maxChips} more
										</span>
									)}
								</div>
							)}
							<span className={`truncate ${selectedItems.length === 0 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
								{displayText}
							</span>
						</div>
					</div>
					<div className="flex items-center flex-shrink-0">
						<ChevronDown className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
					</div>
				</button>

			</div>
			{isOpen && (
				<div
					ref={dropdownContainerRef}
					style={dropdownStyles}
					className="flex flex-col bg-[var(--color-panel-solid)] border border-[var(--gray-a6)] rounded-md shadow-lg overflow-hidden ease-in duration-100 opacity-100 z-[100000]"
				>
					<OptionSearch
						ref={searchInputRef}
						value={query}
						onChange={(text) => {
							setQuery(text);
							subject && subject.next(text);
						}}
						onKeyDown={handleKeyDown}
						listboxId={listboxId}
						loading={false}
						resultCount={filteredItems.length}
					/>
					<div
						id={listboxId}
						className="flex-1 min-h-0 overflow-auto py-1"
						style={{ maxHeight: `${dropdownListMaxHeight}px`, overscrollBehavior: "contain" }}
					>
						{filteredItems?.length === 0
							? <div className="flex justify-center text-sm">
								No results found
							</div>
							: filteredItems.map((item) => {
								const isSelected = selectedIndex === filteredItems.findIndex(i => i[idKey] === item[idKey]);
								const isCurrent = internalValues.includes(String(item[idKey]));
								const isDisabled = !isCurrent && isMaxReached;

								return (<button key={item[idKey]}
									onClick={() => handleSelect(item)}
									disabled={isDisabled}
									aria-selected={isCurrent}
									data-focused={isSelected}
									className={cn("w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors cursor-pointer",
										isDisabled
											? "text-gray-400 dark:text-gray-500 cursor-not-allowed bg-gray-50 dark:bg-gray-800"
											: isSelected
												? "bg-[var(--accent-3,#eff6ff)] text-[var(--accent-11,#1d4ed8)] font-semibold"
												: "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
										isCurrent ? "bg-[var(--accent-3,#eff6ff)] text-[var(--accent-11,#1d4ed8)] font-semibold" : ""
									)}>
									<OptionRow
										title={String(item[displayKey] ?? "")}
										subtitle={resolveItemSubtitle(item, itemSubtitle)}
										icon={resolveItemIcon(item, itemIcon)}
										avatar={resolveItemAvatar(item, itemAvatar, displayKey)}
									/>
									{isCurrent && (<Check className="h-4 w-4 text-[var(--accent-11,#2563eb)] ml-2 flex-shrink-0" />)}
								</button>)
							})}
					</div>
				</div>
			)}
			{
				displayHelperText && (
					<Text
						size="1"
						id="autocomplete-helper"
						className={cn(
							"block mt-2 mr-1 item-center",
							hasError ? "text-red-500" : "text-gray-600 dark:text-gray-400"
						)}>
						{hasError && <AlertCircle className=" inline-block h-3 w-3 mr-[0.1rem]" />}
						{displayHelperText}
					</Text>
				)

			}
		</Box>
	})
}

const MultiAutocompleteBase = createMultiAutocomplete<Record<string, any>>()
MultiAutocompleteBase.displayName = "MultiAutocomplete";

export { MultiAutocompleteBase };
