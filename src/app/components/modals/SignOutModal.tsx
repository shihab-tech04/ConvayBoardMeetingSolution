import { LogOut } from "lucide-react";
import { AppModal } from "./AppModal";
import { SecondaryButton } from "../buttons/SecondaryButton";
import { DangerButton } from "../buttons/DangerButton";

interface SignOutModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function SignOutModal({ onConfirm, onCancel }: SignOutModalProps) {
  return (
    <AppModal
      open={true}
      title="Sign out?"
      onClose={onCancel}
      size="sm"
      icon={<LogOut size={16} strokeWidth={1.75} />}
      footer={
        <>
          <SecondaryButton onClick={onCancel} size="md">Cancel</SecondaryButton>
          <DangerButton onClick={onConfirm} size="md">Sign Out</DangerButton>
        </>
      }
    >
      <p className="app-modal-confirm__message">
        You will need to sign in again to access your account.
      </p>
    </AppModal>
  );
}
