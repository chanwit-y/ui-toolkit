import { X, type LucideIcon } from "lucide-react";
import { IconData } from "./core/const/iconData";
import { Avatar } from "./Avatar";
import { cn } from "../util/utils";

type Item = Record<string, any>;

export type OptionItemIcon<T extends Item = Item> =
	| keyof typeof IconData
	| LucideIcon
	| ((item: T) => keyof typeof IconData | LucideIcon);
export type OptionItemSubtitle<T extends Item = Item> = keyof T | ((item: T) => string);
export type OptionAvatarValue = string | { src: string; alt?: string; fallback?: string };
export type OptionItemAvatar<T extends Item = Item> = keyof T | ((item: T) => OptionAvatarValue);

export type OptionAvatarProps = { src: string; alt?: string; fallback?: string };

/** Icon key (`IconData`) or lucide component → component; `null` when unset/unknown. */
export const resolveIcon = (icon?: keyof typeof IconData | LucideIcon | null): LucideIcon | null => {
	if (!icon) return null;
	if (typeof icon === "string") return (IconData[icon as keyof typeof IconData] as LucideIcon) ?? null;
	return icon as LucideIcon;
};

export const resolveItemIcon = <T extends Item>(item: T, itemIcon?: OptionItemIcon<T>): LucideIcon | null => {
	if (!itemIcon) return null;
	// lucide icons are forwardRef objects, so a plain function is the per-item form
	if (typeof itemIcon === "function") return resolveIcon((itemIcon as (item: T) => keyof typeof IconData | LucideIcon)(item));
	return resolveIcon(itemIcon as keyof typeof IconData | LucideIcon);
};

export const resolveItemSubtitle = <T extends Item>(item: T, itemSubtitle?: OptionItemSubtitle<T>): string | null => {
	if (!itemSubtitle) return null;
	const text = typeof itemSubtitle === "function" ? itemSubtitle(item) : item[itemSubtitle];
	return text == null || text === "" ? null : String(text);
};

export const resolveItemAvatar = <T extends Item>(
	item: T,
	itemAvatar: OptionItemAvatar<T> | undefined,
	displayKey: keyof T,
): OptionAvatarProps | null => {
	if (!itemAvatar) return null;
	const value = typeof itemAvatar === "function" ? itemAvatar(item) : item[itemAvatar];
	const alt = item[displayKey] == null ? undefined : String(item[displayKey]);
	if (typeof value === "string") return value ? { src: value, alt } : null;
	if (value && typeof value === "object" && "src" in value) {
		return { src: value.src, alt: value.alt || alt, fallback: value.fallback };
	}
	return null;
};

/**
 * Client-side option filter shared by the autocompletes: matches the search key,
 * plus the subtitle field when it is a key (the function form is skipped — it
 * would run per item per keystroke).
 */
export const matchesOptionQuery = <T extends Item>(
	item: T,
	query: string,
	searchKey: keyof T,
	itemSubtitle?: OptionItemSubtitle<T>,
): boolean => {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	const hit = (value: unknown) => value != null && String(value).toLowerCase().includes(q);
	if (hit(item[searchKey])) return true;
	return typeof itemSubtitle === "function" || itemSubtitle == null ? false : hit(item[itemSubtitle]);
};

export type OptionRowProps = {
	title: string;
	subtitle?: string | null;
	icon?: keyof typeof IconData | LucideIcon | null;
	/** Wins over `icon` — one leading visual per row. */
	avatar?: OptionAvatarProps | null;
	className?: string;
};

/**
 * The content of one option row (leading avatar/icon, title, subtitle) — shared
 * by Autocomplete2 and MultiAutocomplete so the two dropdowns can't drift. The
 * host owns the row button, its colours and the trailing check mark.
 */
export const OptionRow = ({ title, subtitle, icon, avatar, className }: OptionRowProps) => {
	const IconComponent = avatar ? null : resolveIcon(icon);
	return (
		<div className={cn("flex items-center gap-2 flex-1 min-w-0", className)}>
			{avatar && (
				<Avatar src={avatar.src} alt={avatar.alt} size="xs" fallback={avatar.fallback} className="flex-shrink-0" />
			)}
			{IconComponent && <IconComponent className="h-4 w-4 text-[var(--gray-9)] flex-shrink-0" />}
			<div className="flex flex-col gap-0.5 min-w-0 flex-1">
				<span className="truncate">{title}</span>
				{subtitle && <span className="text-xs font-normal text-[var(--gray-10)] truncate">{subtitle}</span>}
			</div>
		</div>
	);
};
OptionRow.displayName = "OptionRow";

export type SelectedChipProps = {
	title: string;
	icon?: keyof typeof IconData | LucideIcon | null;
	/** Wins over `icon`, as on the row. */
	avatar?: OptionAvatarProps | null;
	/** Rendered as the trailing ✕; no button when omitted (inert previews). */
	onRemove?: (event: React.MouseEvent<HTMLButtonElement>) => void;
	className?: string;
};

/**
 * One selected option as the multi autocomplete's trigger draws it: the row's
 * leading avatar / icon, the title and a remove button — a compact token, so
 * the subtitle stays on the row. Shared with the studio's option preview.
 */
export const SelectedChip = ({ title, icon, avatar, onRemove, className }: SelectedChipProps) => {
	const IconComponent = avatar ? null : resolveIcon(icon);
	return (
		<span
			className={cn(
				"flex items-center gap-1 px-2 py-1 bg-[var(--accent-3)] text-[var(--accent-12)] text-xs rounded-md max-w-[140px] border border-[var(--accent-6)]",
				className,
			)}
		>
			{avatar && (
				<Avatar src={avatar.src} alt={avatar.alt} size={16} fallback={avatar.fallback} className="flex-shrink-0" />
			)}
			{IconComponent && <IconComponent className="h-3 w-3 flex-shrink-0 opacity-80" />}
			<span className="truncate">{title}</span>
			{onRemove && (
				<button
					type="button"
					aria-label={`Remove ${title}`}
					onClick={onRemove}
					className="hover:bg-[var(--accent-4)] rounded-full p-0.5 flex-shrink-0"
				>
					<X className="h-3 w-3" />
				</button>
			)}
		</span>
	);
};
SelectedChip.displayName = "SelectedChip";
