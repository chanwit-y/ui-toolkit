import { Tabs } from "@radix-ui/themes";
import {
	forwardRef,
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
	type CSSProperties,
	type ElementRef,
	type PointerEvent,
	type ReactNode,
} from "react";
import { cn } from "../util/utils";

export type TabItemContent = {
	value: string;
	label: string;
	content: ReactNode;
};

export type TabProps = {
	defaultValue?: string;
	items: TabItemContent[];
	className?: string;
};

/** Spawns a MUI-style ripple inside the pressed trigger */
const spawnRipple = (e: PointerEvent<HTMLButtonElement>) => {
	const target = e.currentTarget;
	const rect = target.getBoundingClientRect();
	const size = Math.max(rect.width, rect.height) * 2;

	const ripple = document.createElement("span");
	ripple.className = "tab-ripple";
	ripple.style.width = `${size}px`;
	ripple.style.height = `${size}px`;
	ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
	ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
	ripple.addEventListener("animationend", () => ripple.remove());
	target.appendChild(ripple);
};

const Tab = forwardRef<ElementRef<typeof Tabs.Root>, TabProps>(
	({ defaultValue, items, className }, ref) => {
		const initialValue = defaultValue ?? items[0]?.value;
		const [value, setValue] = useState(initialValue);
		const listWrapperRef = useRef<HTMLDivElement | null>(null);
		const [indicator, setIndicator] = useState<CSSProperties>({
			left: 0,
			width: 0,
			opacity: 0,
		});

		const updateIndicator = useCallback(() => {
			const wrapper = listWrapperRef.current;
			if (!wrapper) return;
			const active = wrapper.querySelector<HTMLElement>('[data-state="active"]');
			if (!active) return;
			const wrapperRect = wrapper.getBoundingClientRect();
			const rect = active.getBoundingClientRect();
			setIndicator({
				left: rect.left - wrapperRect.left,
				width: rect.width,
				opacity: 1,
			});
		}, []);

		useLayoutEffect(() => {
			updateIndicator();
			const wrapper = listWrapperRef.current;
			if (!wrapper) return;
			const observer = new ResizeObserver(updateIndicator);
			observer.observe(wrapper);
			return () => observer.disconnect();
		}, [updateIndicator, value, items.length]);

		if (items.length === 0) return null;

		return (
			<Tabs.Root
				ref={ref}
				value={value}
				onValueChange={setValue}
				className={cn("tab-root w-full", className)}
			>
				<div ref={listWrapperRef} className="tab-list-wrapper">
					<Tabs.List className="tab-list">
						{items.map((item) => (
							<Tabs.Trigger
								key={item.value}
								value={item.value}
								className="tab-trigger"
								onPointerDown={spawnRipple}
							>
								{item.label}
							</Tabs.Trigger>
						))}
					</Tabs.List>
					<span className="tab-indicator" style={indicator} aria-hidden="true" />
				</div>
				{items.map((item) => (
					<Tabs.Content key={item.value} value={item.value} className="tab-content">
						{item.content}
					</Tabs.Content>
				))}
			</Tabs.Root>
		);
	}
);

Tab.displayName = "Tab";

export { Tab };
