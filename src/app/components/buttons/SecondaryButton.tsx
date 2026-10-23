import { Button, type ButtonProps } from "./Button";

export type SecondaryButtonProps = Omit<ButtonProps, "variant">;

export function SecondaryButton({ size = "md", ...props }: SecondaryButtonProps) {
  return <Button variant="secondary" size={size} {...props} />;
}
