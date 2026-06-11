import React, { forwardRef, type ElementRef, type ReactNode } from "react";
import { Text as RadixText, Heading as RadixHeading, type TextProps as RadixTextProps, type HeadingProps as RadixHeadingProps } from "@radix-ui/themes";
import * as Tooltip from "@radix-ui/react-tooltip";
import { cn } from "../util/utils";

export type TypographyVariant = 
  | "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  | "body1" | "body2" | "subtitle1" | "subtitle2"
  | "caption" | "overline" | "button"
  | "display1" | "display2";

export interface TypographyProps extends Omit<RadixTextProps, 'size' | 'weight' | 'align'> {
  variant?: TypographyVariant;
  component?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div' | 'label';
  text?: ReactNode;
  size?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
  weight?: 'light' | 'regular' | 'medium' | 'bold';
  color?: RadixTextProps['color'];
  align?: 'left' | 'center' | 'right' | 'justify';
  transform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
  decoration?: 'none' | 'underline' | 'line-through';
  truncate?: boolean;
  noWrap?: boolean;
  href?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
  rel?: string;
  tooltip?: string;
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
  tooltipDelay?: number;
}

const variantConfig: Record<TypographyVariant, {
  component: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  size: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
  weight: 'light' | 'regular' | 'medium' | 'bold';
  className?: string;
  useHeading?: boolean;
}> = {
  display1: { component: 'h1', size: '9', weight: 'bold', className: 'leading-tight', useHeading: true },
  display2: { component: 'h2', size: '8', weight: 'bold', className: 'leading-tight', useHeading: true },
  h1: { component: 'h1', size: '7', weight: 'bold', className: 'leading-tight', useHeading: true },
  h2: { component: 'h2', size: '6', weight: 'bold', className: 'leading-tight', useHeading: true },
  h3: { component: 'h3', size: '5', weight: 'bold', className: 'leading-tight', useHeading: true },
  h4: { component: 'h4', size: '4', weight: 'bold', className: 'leading-tight', useHeading: true },
  h5: { component: 'h5', size: '3', weight: 'bold', className: 'leading-tight', useHeading: true },
  h6: { component: 'h6', size: '2', weight: 'bold', className: 'leading-tight', useHeading: true },
  body1: { component: 'p', size: '3', weight: 'regular', className: 'leading-relaxed' },
  body2: { component: 'p', size: '2', weight: 'regular', className: 'leading-relaxed' },
  subtitle1: { component: 'p', size: '4', weight: 'medium', className: 'leading-snug' },
  subtitle2: { component: 'p', size: '3', weight: 'medium', className: 'leading-snug' },
  caption: { component: 'span', size: '1', weight: 'regular', className: 'leading-normal' },
  overline: { component: 'span', size: '1', weight: 'medium', className: 'uppercase tracking-wider leading-normal' },
  button: { component: 'span', size: '2', weight: 'medium', className: 'leading-none' },
};

const Typography = forwardRef<ElementRef<'div'>, TypographyProps>(({
  variant = 'body1',
  component,
  text,
  children,
  className,
  size,
  weight,
  color,
  align,
  transform,
  decoration,
  truncate,
  noWrap,
  href,
  target,
  rel,
  tooltip,
  tooltipSide = 'top',
  tooltipDelay = 700,
  ...props
}, ref) => {
  const config = variantConfig[variant];
  const resolvedSize = size ?? config.size;
  const resolvedWeight = weight ?? config.weight;
  const content = text ?? children;

  const resolvedElement = (() => {
    const base = component ?? config.component;
    if (!tooltip) {
      return href ? config.component : base;
    }
    if (href || base === "p" || base === "div") {
      return "span";
    }
    return base;
  })();

  const typographyClasses = cn(
    config.className,
    tooltip && "inline-block w-fit max-w-full",
    {
      'text-left': align === 'left',
      'text-center': align === 'center',
      'text-right': align === 'right',
      'text-justify': align === 'justify',
      'capitalize': transform === 'capitalize',
      'uppercase': transform === 'uppercase',
      'lowercase': transform === 'lowercase',
      'underline': decoration === 'underline',
      'line-through': decoration === 'line-through',
      'truncate': truncate,
      'whitespace-nowrap': noWrap,
      'cursor-pointer hover:opacity-80': href,
    },
    className
  );

  const resolvedRel = rel || (target === '_blank' ? 'noopener noreferrer' : undefined);

  const renderContent = () => {
    if (config.useHeading) {
      return (
        <RadixHeading
          ref={href ? undefined : (ref as any)}
          as={resolvedElement as any}
          size={resolvedSize as any}
          weight={resolvedWeight as any}
          color={color}
          className={href ? undefined : typographyClasses}
          {...(props as any)}
        >
          {content}
        </RadixHeading>
      );
    }

    return (
      <RadixText
        ref={href ? undefined : (ref as any)}
        as={resolvedElement as any}
        size={resolvedSize as any}
        weight={resolvedWeight as any}
        color={color}
        className={href ? undefined : typographyClasses}
        {...(props as any)}
      >
        {content}
      </RadixText>
    );
  };

  const renderWithTooltip = (content: React.ReactElement) => {
    if (!tooltip) return content;

    return (
      <Tooltip.Provider>
        <Tooltip.Root delayDuration={tooltipDelay}>
          <Tooltip.Trigger asChild>
            {content}
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side={tooltipSide}
              sideOffset={4}
              align="center"
              className="z-50 max-w-xs rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-md"
            >
              {tooltip}
              <Tooltip.Arrow className="fill-gray-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  };

  if (href) {
    const linkElement = (
      <a
        ref={ref as any}
        href={href}
        target={target}
        rel={resolvedRel}
        className={cn(typographyClasses, 'no-underline text-inherit')}
      >
        {renderContent()}
      </a>
    );
    return renderWithTooltip(linkElement);
  }

  return renderWithTooltip(renderContent());
});

Typography.displayName = "Typography";

export { Typography };