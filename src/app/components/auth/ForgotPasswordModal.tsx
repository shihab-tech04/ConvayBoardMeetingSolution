import { useState } from "react";
import { AppTextField } from "../forms/AppTextField";
import { AppModal } from "../modals/AppModal";
import { Button } from "../buttons/Button";

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ open, onClose }: ForgotPasswordModalProps) {
  const [userId, setUserId] = useState("");

  const footer = (
    <div className="flex gap-3">
      <Button variant="ghost" size="lg" fullWidth onClick={onClose}>{"Cancel"}</Button>
      <Button variant="primary" size="lg" fullWidth onClick={onClose}>{"Send reset instructions"}</Button>
    </div>
  );

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Reset your password"
      size="sm"
      footer={footer}
    >
      <p className="modal-form-header__subtitle mb-4">{"Enter your User ID or email. We will send password reset instructions if the account exists."}</p>
      <AppTextField
        id="forgot-password-user-id"
        label="Enter your User ID or email"
        value={userId}
        onChange={setUserId}
        placeholder="Enter your User ID or email"
        autoComplete="username"
      />
    </AppModal>
  );
}
