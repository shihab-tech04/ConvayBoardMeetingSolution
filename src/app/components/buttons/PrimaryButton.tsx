import { Button, type ButtonProps } from "./Button";

export type PrimaryButtonProps = Omit<ButtonProps, "variant">;

export function PrimaryButton({ size = "md", ...props }: PrimaryButtonProps) {
  return <Button variant="primary" size={size} {...props} />;
}
