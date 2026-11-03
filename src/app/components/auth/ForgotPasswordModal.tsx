import { AppModal } from "../modals/AppModal";
import { Button } from "../buttons/Button";

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ open, onClose }: ForgotPasswordModalProps) {
  return (
    <AppModal
      open={open} onClose={onClose}
      title="Reset your password" size="sm"
      footer={<Button variant="primary" size="lg" fullWidth onClick={onClose}>Close</Button>}
    >
      <p className="modal-form-header__subtitle mb-4">
        Contact the Super Admin to have a new password assigned to your account.
      </p>
    </AppModal>
  );
}