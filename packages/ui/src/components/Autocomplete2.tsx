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
import type { AutocompleteItem2, AutocompleteProps2, DataValue, Obs } from "./@types";
import { Box, Text } from "@radix-ui/themes";
import { cn } from "../util/utils";
import { AlertCircle, Check, ChevronDown, Loader2, Search, X, type LucideIcon } from "lucide-react";
import { useCore } from "./core/context";
import { debounce, distinct, interval, Subject, switchMap } from "rxjs";
import { isEmpty } from "lodash";
import { useQuery } from "@tanstack/react-query";
import { useObservableCleanup } from "../hooks";
import { ConditionExpression } from "./core/expression";
import { useData } from "./context/DataProvider";
import { IconData } from "./core/const/iconData";
import { Avatar } from "./Avatar";

const createAutocomplete = <T extends Record<string, any>>() => {
	return forwardRef<
		ElementRef<"button">,
		AutocompleteProps2<T> & { onChange?: (value: string) => void }
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
		value,
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
		// defaultData: defaultValue,
		// apiCanSearch = false,
		// apiObserveParam,

		enabledWhen,

		isSingleLoad,

		onValueChange,
		onChange,
		onBlur,

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
		const [observeApiData, setObserveApiData] = useState<unknown>();
		const [isObserveEnabled, setIsObserveEnabled] = useState(true);


		const dropdownRef = useRef<HTMLDivElement>(null);
		const dropdownContainerRef = useRef<HTMLDivElement>(null);
		const dropdownListRef = useRef<HTMLDivElement>(null);
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

			return items.filter(item => item[searchKey].toLowerCase().includes(query.toLowerCase()))
		}, [query, items, maxResults])
		const hasError = useMemo(() => error && !!errorMessage, [error, errorMessage]);
		const displayHelperText = useMemo(() => hasError ? errorMessage : helperText, [hasError, errorMessage, helperText]);
		const selectedItem = useMemo(() => items.find(item => String(item[idKey]) === String(value)), [items, value, searchKey]);

		const resolveDataValue = useCallback((value: DataValue, text: string) => {
			if (value.type === "value") {
				return value.value !== undefined ? value.value : text;
			}
			return undefined;
		}, []);

		const fetchData = useCallback((text: string) => {
			const q = Object.entries(apiInfo?.query ?? {}).reduce((acc, [key, value]) => {
				return { ...acc, [key]: resolveDataValue(value, text) }
			}, {} as Record<string, unknown>)

			const b = Object.entries(apiInfo?.body ?? {}).reduce((acc, [key, value]) => {
				return { ...acc, [key]: resolveDataValue(value, text) }
			}, {} as Record<string, unknown>)

			if (observeTo !== "") {
				if (!isEmpty(apiInfo?.params)) {
					if (!isEmpty(observeApiData)) {
						const p = Object.entries(apiInfo?.params ?? {}).reduce((acc, [key, value]) => {
							return {
								...acc,
								[key]: value.type === "observe"
									? observeApiData
									: value.type === "value"
										? resolveDataValue(value, text)
										: value
							}
						}, {} as Record<string, unknown>)

						if (!isEmpty(apiInfo?.query) && !isEmpty(apiInfo?.body)) {
							return api?.({ ...q }, { ...p }, { ...b })
						}

						return api?.({ ...q }, { ...p })
					}
				}
			} else if (!isEmpty(apiInfo?.query) && !isEmpty(apiInfo?.body)) {
				return api?.({ ...q }, { ...b })
			} else if (!isEmpty(apiInfo?.query)) {
				return api?.({ ...q })
			} else if (!isEmpty(apiInfo?.body)) {
				return api?.({ ...b })
			} else {
				return api?.()
			}

			return undefined
		}, [observeTo, observeApiData, api, apiInfo, resolveDataValue]);

		const hasApiSearch = !!(api && apiInfo?.query);
		const [isSearching, setIsSearching] = useState(false);

		const { data, isFetching } = useQuery({
			queryKey: [`${name}-${apiInfo?.name}`],
			queryFn: () => fetchData(""),
			staleTime: Infinity,
			gcTime: Infinity,
			enabled: !!api && !hasApiSearch,
		})

		const apiSearch = useMemo(() => {
			if (hasApiSearch) {
				return subject.pipe(
					debounce(() => interval(500)),
					distinct(),
					switchMap(async (text) => {
						if (isSingleLoad && items.length > 0) return
						setIsSearching(true);
						try {
							return await fetchData(text);
						} finally {
							setIsSearching(false);
						}
					}),
				)
			}

			return undefined
		}, [subject, hasApiSearch, fetchData, isSingleLoad, items.length])


		// const ctx = useStord((state) => state.contextData)
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

		const handValueChange = useCallback((newValue: string) => {
			onValueChange?.(newValue);
			onChange?.(newValue);
			if (canObserve && name) {
				// observeTable?.[name as keyof typeof observeTable].next(newValue);
				getDataValue({ key: name, type: "observe" })?.next(newValue)
			}
		}, [onValueChange, onChange, canObserve, name, getDataValue])

		const handleSelect = useCallback((item: T) => {
			handValueChange(String(item[idKey]));
			setQuery('');
			setIsOpen(false);
			setSelectedIndex(-1);
			if (onBlur) onBlur();
		}, [handValueChange, onBlur, idKey])

		const handleListWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
			event.preventDefault();
			event.stopPropagation();
			event.currentTarget.scrollTop += event.deltaY;
		}, []);

		useEffect(() => {
			if (!isOpen || !dropdownListRef.current) return;

			const listEl = dropdownListRef.current;
			const onNativeWheel = (event: WheelEvent) => {
				event.preventDefault();
				event.stopPropagation();
				listEl.scrollTop += event.deltaY;
			};

			listEl.addEventListener("wheel", onNativeWheel, { passive: false });

			return () => {
				listEl.removeEventListener("wheel", onNativeWheel);
			};
		}, [isOpen]);

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
			const dropdownHeaderHeight = 44;
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
			setIsOpen((prev) => !prev);
			setTimeout(() => {
				dropdownContainerRef.current?.classList.add('opacity-100');
				searchInputRef.current?.focus();
			}, 0);
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

		useObservableCleanup(
			observeTo ? getDataValue({ key: observeTo, type: "observe" }) : null,
			(data: unknown) => {
				onChange?.(null as any)
				onValueChange?.(null as any)
				setObserveApiData(data)
			},
			[observeTo, onChange, onValueChange]
		)

		const getItems = useCallback((res: any) => {
			let data = res
			apiInfo?.paths?.forEach((path) => {
				data = data[path]
			})
			return data ?? []
		}, [apiInfo])

		useEffect(() => {
			if (!hasApiSearch) return;

			setIsSearching(true);
			fetchData("")?.then((res) => {
				setItems(getItems(res));
			}).finally(() => {
				setIsSearching(false);
			});
		}, [hasApiSearch, fetchData, getItems, observeApiData])

		useObservableCleanup(
			apiSearch,
			(res) => {
				if (res) setItems(getItems(res));
			},
			[getItems]
		);

		useEffect(() => {
			if (hasApiSearch) return;
			data && setItems(getItems(data))
		}, [hasApiSearch, data, getItems])

		const showFetching = isFetching || isSearching;

		const dropdown = isOpen ? (
			<div
				ref={dropdownContainerRef}
				style={dropdownStyles}
				className="dropdown flex flex-col bg-white dark:bg-gray-900 border ring-2 ring-[var(--accent-8,#60a5fa)] border-transparent rounded-md shadow-lg overflow-hidden ease-in duration-100 opacity-100 z-[100000]"
			>
				<div className="flex items-center border-b border-gray-100 dark:border-gray-800 px-3">
					<Search className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
					<input
						type="text"
						ref={searchInputRef}
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							subject && subject.next(e.target.value);
						}}
						onKeyDown={handleKeyDown}
						placeholder="Type to search..."
						className="flex-1 py-2 text-sm border-none outline-none bg-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
					/>
					{query && (
						<button
							onClick={() => setQuery('')}
							className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
						>
							<X className="h-3 w-3 text-gray-400 dark:text-gray-500" />
						</button>
					)}

				</div>
				<div
					ref={dropdownListRef}
					id={listboxId}
					className="flex-1 min-h-0 overflow-auto py-1"
					style={{ maxHeight: `${dropdownListMaxHeight}px`, overscrollBehavior: "contain" }}
					onWheel={handleListWheel}
				>

					{showFetching && (
						<div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-500 dark:text-gray-400">
							<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
							Loading...
						</div>
					)}
					{filteredItems?.length === 0 && !showFetching
						? <div className="flex justify-center py-3 text-sm text-gray-500 dark:text-gray-400">
							No results found
						</div>
						: filteredItems.map((item, index) => {
							const isSelected = selectedIndex === index;
							const isCurrent = value === item[idKey];
							
							// Determine the icon for this item
							let ItemIconComponent: LucideIcon | null = null;
							if (itemIcon) {
								if (typeof itemIcon === 'function') {
									const iconResult = itemIcon(item);
									if (typeof iconResult === 'string') {
										ItemIconComponent = IconData[iconResult as keyof typeof IconData] as LucideIcon;
									} else {
										ItemIconComponent = iconResult as LucideIcon;
									}
								} else if (typeof itemIcon === 'string') {
									ItemIconComponent = IconData[itemIcon as keyof typeof IconData] as LucideIcon;
								} else {
									ItemIconComponent = itemIcon as LucideIcon;
								}
							}

							// Determine the subtitle for this item
							let itemSubtitleText: string | null = null;
							if (itemSubtitle) {
								if (typeof itemSubtitle === 'function') {
									itemSubtitleText = itemSubtitle(item);
								} else {
									itemSubtitleText = item[itemSubtitle] as string;
								}
							}
							
							// Determine the avatar for this item
							let itemAvatarProps: { src: string; alt?: string; fallback?: string } | null = null;
							if (itemAvatar) {
								if (typeof itemAvatar === 'function') {
									const avatarResult = itemAvatar(item);
									if (typeof avatarResult === 'string') {
										itemAvatarProps = { src: avatarResult, alt: item[displayKey] };
									} else if (avatarResult && typeof avatarResult === 'object') {
										itemAvatarProps = {
											src: avatarResult.src,
											alt: avatarResult.alt || item[displayKey],
											fallback: avatarResult.fallback
										};
									}
								} else {
									const avatarValue = item[itemAvatar];
									if (typeof avatarValue === 'string') {
										itemAvatarProps = { src: avatarValue, alt: item[displayKey] };
									} else if (avatarValue && typeof avatarValue === 'object' && 'src' in avatarValue) {
										itemAvatarProps = {
											src: (avatarValue as any).src,
											alt: (avatarValue as any).alt || item[displayKey],
											fallback: (avatarValue as any).fallback
										};
									}
								}
							}
							
							return (<button key={item[idKey]}
								onClick={() => handleSelect(item)}
								aria-selected={isCurrent}
								data-focused={isSelected}
								className={cn("w-full flex items-center justify-between px-3 text-sm text-left transition-colors cursor-pointer",
									itemSubtitleText ? "py-2" : "py-2",
									isSelected
										? "bg-[var(--accent-3,#eff6ff)] text-[var(--accent-11,#1d4ed8)] font-semibold"
										: "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
									isCurrent ? "bg-[var(--accent-3,#eff6ff)] text-[var(--accent-11,#1d4ed8)] font-semibold" : ""
								)}>
								<div className="flex items-center gap-2 flex-1 min-w-0">
									{itemAvatarProps && <Avatar 
										src={itemAvatarProps.src} 
										alt={itemAvatarProps.alt} 
										size="xs" 
										fallback={itemAvatarProps.fallback}
										className="flex-shrink-0" 
									/>}
									{!itemAvatarProps && ItemIconComponent && <ItemIconComponent className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />}
									<div className="flex flex-col gap-0.5 min-w-0 flex-1">
										<span className="truncate">{item[displayKey]}</span>
										{itemSubtitleText && (
											<span className="text-xs text-gray-500 dark:text-gray-400 truncate">{itemSubtitleText}</span>
										)}
									</div>
								</div>
								{isCurrent && (<Check className="h-4 w-4 text-[var(--accent-11,#2563eb)] ml-2 flex-shrink-0" />)}
							</button>)
						})}
				</div>
			</div>
		) : null;

		return <Box className="w-full flex flex-col justify-start h-20 relative">
			{
				label && (
					<Text as="label" size="2" weight="medium" className="block mb-1">
						{label}
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
			<div className="autocomplete-trigger w-full" ref={dropdownRef}>
				<button
					ref={setTriggerButtonRef}
					onClick={openDropdown}
					disabled={!isObserveEnabled}
					className={cn("w-full h-[40px] px-4 text-sm flex items-center justify-between",
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
						{(() => {
							let IconComponent: LucideIcon;
							if (inputIcon) {
								if (typeof inputIcon === 'string') {
									IconComponent = IconData[inputIcon as keyof typeof IconData] as LucideIcon || Search;
								} else {
									IconComponent = inputIcon;
								}
							} else {
								IconComponent = Search;
							}
							return <IconComponent className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />;
						})()}
						<span className={`truncate ${!selectedItem ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
							{selectedItem ? selectedItem[displayKey] : placeholder}
						</span>
					</div>
					<div className="flex items-center flex-shrink-0 gap-2">
						{showFetching && <Loader2 className="h-4 w-4 text-gray-400 dark:text-gray-500 animate-spin" aria-hidden="true" />}
						<ChevronDown className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
					</div>
				</button>
			</div>
			{dropdown}
			{
				displayHelperText && (
					<Text
						size="1"
						id="autocomplete-helper"
						className={cn(
							"block mt-2 mr-1 item-center",
							hasError ? "text-red-500 flex items-center gap-0.5" : "text-gray-600 dark:text-gray-400"
						)}>
						{hasError && <AlertCircle className=" inline-block h-3 w-3 mr-[0.1rem]" />}
						{displayHelperText}
					</Text>
				)

			}
		</Box>
	})
}

const AutocompleteBase2 = createAutocomplete<AutocompleteItem2>()
AutocompleteBase2.displayName = "Autocomplete2";

// const Autocomplete2 = withTheam(AutocompleteBase2);

export { AutocompleteBase2 };