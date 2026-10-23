import type { HTMLAttributes, ReactNode } from "react";

export interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  align?: "start" | "end" | "between";
  stackOnMobile?: boolean;
}

export function ButtonGroup({
  children,
  align = "end",
  stackOnMobile = false,
  className = "",
  ...rest
}: ButtonGroupProps) {
  const classes = [
    "btn-group",
    align === "end" ? "btn-group--end" : align === "between" ? "btn-group--between" : "btn-group--start",
    stackOnMobile ? "btn-group--stack-mobile" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
