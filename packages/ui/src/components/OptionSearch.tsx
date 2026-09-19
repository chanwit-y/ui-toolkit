import { forwardRef, type KeyboardEvent } from "react";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "../util/utils";

/** Header height the dropdown positioning reserves for `OptionSearch` (p-2 + h-9 + border). */
export const OPTION_SEARCH_HEIGHT = 53;

export type OptionSearchProps = {
	value: string;
	onChange: (value: string) => void;
	onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
	/** `id` of the listbox the field drives (`aria-controls`). */
	listboxId?: string;
	placeholder?: string;
	/** Replaces the clear button with a spinner while results load. */
	loading?: boolean;
	/** Matches for the current query — shown while one is typed. */
	resultCount?: number;
	className?: string;
};

/**
 * The search field at the top of the option dropdown, shared by Autocomplete2
 * and MultiAutocomplete: an inset pill on a padded header (the dropdown itself
 * stays quiet), a search glyph that takes the accent on focus, a spinner or a
 * clear button in the trailing slot and a match count while a query is typed.
 * Surfaces use Radix vars so it follows the theme in both appearances and
 * inside portals.
 */
export const OptionSearch = forwardRef<HTMLInputElement, OptionSearchProps>(
	({ value, onChange, onKeyDown, listboxId, placeholder = "Search…", loading, resultCount, className }, ref) => {
		const hasQuery = value.trim().length > 0;
		return (
			<div className={cn("border-b border-[var(--gray-a5)] p-2", className)}>
				<div
					className={cn(
						"group flex h-9 items-center gap-2 rounded-md px-2.5",
						"bg-[var(--gray-a2)] ring-1 ring-inset ring-[var(--gray-a5)] transition-[box-shadow,background-color] duration-150",
						"focus-within:bg-[var(--color-panel-solid)] focus-within:ring-2 focus-within:ring-[var(--accent-8)]",
					)}
				>
					<Search
						className="h-4 w-4 flex-shrink-0 text-[var(--gray-9)] transition-colors group-focus-within:text-[var(--accent-9)]"
						aria-hidden="true"
					/>
					<input
						ref={ref}
						type="text"
						role="combobox"
						aria-autocomplete="list"
						aria-expanded="true"
						aria-controls={listboxId}
						autoComplete="off"
						spellCheck={false}
						value={value}
						onChange={(e) => onChange(e.target.value)}
						onKeyDown={onKeyDown}
						placeholder={placeholder}
						className="min-w-0 flex-1 border-none bg-transparent text-sm text-[var(--gray-12)] outline-none placeholder:text-[var(--gray-9)]"
					/>
					{hasQuery && !loading && resultCount !== undefined && (
						<span className="flex-shrink-0 text-xs tabular-nums text-[var(--gray-9)]" aria-live="polite">
							{resultCount}
						</span>
					)}
					{loading ? (
						<Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-[var(--gray-9)]" aria-hidden="true" />
					) : (
						hasQuery && (
							<button
								type="button"
								aria-label="Clear search"
								// mousedown, not click: the dropdown's outside-click handler and the
								// input blur must not fire before the query clears.
								onMouseDown={(e) => {
									e.preventDefault();
									onChange("");
								}}
								className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[var(--gray-9)] transition-colors hover:bg-[var(--gray-a4)] hover:text-[var(--gray-12)]"
							>
								<X className="h-3.5 w-3.5" aria-hidden="true" />
							</button>
						)
					)}
				</div>
			</div>
		);
	},
);
OptionSearch.displayName = "OptionSearch";
