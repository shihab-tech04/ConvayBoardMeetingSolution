import { IconButton, type IconButtonProps } from "../buttons/IconButton";

/**
 * Control bar buttons: Mic, Camera, Raise Hand, Reactions, More, Leave.
 * Thin semantic wrapper around IconButton.
 */
export type MeetingControlButtonProps = IconButtonProps & {
  active?: boolean;
  danger?: boolean;
};

export function MeetingControlButton({
  active = false,
  danger = false,
  size = "md",
  ...props
}: MeetingControlButtonProps) {
  return (
    <IconButton
      size={size}
      variant={danger ? "danger" : active ? "default" : "ghost"}
      active={active}
      {...props}
    />
  );
}
