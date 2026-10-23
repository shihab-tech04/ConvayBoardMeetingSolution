import { Button, type ButtonProps } from "./Button";

export type DangerButtonProps = Omit<ButtonProps, "variant">;

export function DangerButton({ size = "md", ...props }: DangerButtonProps) {
  return <Button variant="destructive" size={size} {...props} />;
}
