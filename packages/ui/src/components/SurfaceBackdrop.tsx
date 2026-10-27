export type SurfaceBackdropProps = {
	/**
	 * Cover the viewport (`position: fixed`) instead of the nearest positioned
	 * ancestor — for an app rendered without `AppShell`, whose document scrolls.
	 */
	fixed?: boolean;
	className?: string;
};

/**
 * The layer glass surfaces blur (see the grilled design `glass-surface`):
 * paints `--gummy-backdrop` — the theme's `background`, else the accent
 * gradient of `styles/surface.css` — and renders nothing in `flat`, so it is
 * safe to mount unconditionally. Put it first inside a `relative isolate`
 * host; `AppShell` and `GummyApp` already do.
 */
export function SurfaceBackdrop({ fixed, className }: SurfaceBackdropProps) {
	return <div aria-hidden="true" className={`gummy-backdrop ${className ?? ""}`} data-fixed={fixed || undefined} />;
}
