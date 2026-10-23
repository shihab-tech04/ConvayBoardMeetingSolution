import { Button, type ButtonProps } from "../buttons/Button";

/**
 * Command buttons: Start Meeting, Pause, Resume, Start Break, Adjourn, End Meeting,
 * Present, Complete Agenda Item, Open Vote, Close Vote.
 */
export type MeetingCommandButtonProps = Omit<ButtonProps, "variant"> & {
  destructive?: boolean;
};

export function MeetingCommandButton({
  destructive = false,
  size = "md",
  fullWidth,
  ...props
}: MeetingCommandButtonProps) {
  return (
    <Button
      variant={destructive ? "destructive-subtle" : "secondary"}
      size={size}
      fullWidth={fullWidth}
      {...props}
    />
  );
}
