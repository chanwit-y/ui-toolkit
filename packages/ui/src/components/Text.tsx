import type { ReactNode } from "react";
import { forwardRef, type ElementRef } from "react";
import { Text as RadixText, type TextProps as RadixTextProps } from "@radix-ui/themes";
import { cn } from "../util/utils";

export type TextProps = RadixTextProps & {
	text?: ReactNode;
	isLabel?: boolean;
};

const TextBase = forwardRef<ElementRef<typeof RadixText>, TextProps>(({
	text,
	isLabel,
	children,
	className,
	size,
	weight,
	...props
}, ref) => {
	const content = text ?? children;
	const resolvedSize = size ?? (isLabel ? "2" : undefined);
	const resolvedWeight = weight ?? (isLabel ? "medium" : undefined);

	return (
		<RadixText
			ref={ref}
			{...props}
			className={isLabel ? undefined : className}
			size={resolvedSize}
			weight={resolvedWeight}
			asChild={isLabel || undefined}
		>
			{isLabel ? <label className={cn("block mb-1", className)}>{content}</label> : content}
		</RadixText>
	);
});

TextBase.displayName = "Text";

const Text = TextBase;

export { Text, TextBase };