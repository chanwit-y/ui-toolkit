import React, { createElement } from "react";
import type {  LucideProps } from "lucide-react";
import type { BaseComponentProps } from "./@types";
import { IconData } from "./core/const/iconData";

export type IconProps = BaseComponentProps<
  "span",
  {
    icon: keyof typeof IconData;
    size?: number | string;
    color?: string;
    strokeWidth?: number;
    className?: string;
  } & Omit<LucideProps, "size" | "color" | "strokeWidth">
>;

export const Icon: React.FC<IconProps> = ({
  icon: iconKey,
  size = 24,
  color,
  strokeWidth = 2,
  className,
  ...props
}) => {
  const { ref, ...spanProps } = props;

  return (
    <span className={className} {...spanProps}>
      {
        createElement(IconData[iconKey as keyof typeof IconData], {
          size: size,
          color: color,
          strokeWidth: strokeWidth,
          ref: ref,
        })
      }
      {/* <IconComponent
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        ref={ref}
      /> */}
    </span>
  );
};

export default Icon;
