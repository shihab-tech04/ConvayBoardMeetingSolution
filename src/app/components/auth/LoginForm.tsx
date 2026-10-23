import { useState, startTransition } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../store/store";
import { login } from "../../store/authSlice";
import { NCCBankBoardLogo } from "../navigation/NCCBankBoardLogo";
import { AppTextField } from "../forms/AppTextField";
import { AppPasswordField } from "../forms/AppPasswordField";
import { AppCheckbox } from "../forms/AppCheckbox";
import { useHelp } from "../../context/HelpContext";
import { Button } from "../buttons/Button";

interface LoginFormProps {
  isDesktop: boolean;
  onForgotPassword: () => void;
}

export function LoginForm({ isDesktop, onForgotPassword }: LoginFormProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { openHelp } = useHelp();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      startTransition(() => {
        dispatch(login({ userId: userId || undefined }));
      });
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSignIn();
  };

  return (
    <div className={`lp-form${isDesktop ? "" : " lp-form--mobile"}`}>
      {/* Brand lockup — always visible; left panel has no logo */}
      <div className="lp-form__brand">
        <NCCBankBoardLogo variant="mark" size={38} className="lp-form__logo-mark" />
        <div className="lp-form__brand-text">
          <span className="lp-form__brand-name">Convay</span>
          <span className="lp-form__brand-product">Board Meeting</span>
        </div>
      </div>

      {/* Heading */}
      <div className="lp-form__heading-block">
        <h1 className="lp-form__heading">Welcome</h1>
      </div>

      {/* Fields */}
      <div className="lp-form__fields">
        <AppTextField
          id="login-user-id"
          label="User ID or email"
          value={userId}
          onChange={setUserId}
          onKeyDown={handleKeyDown}
          placeholder="Enter your User ID or email"
          autoComplete="username"
        />

        <AppPasswordField
          id="login-password"
          label="Password"
          value={password}
          onChange={setPassword}
          onKeyDown={handleKeyDown}
          placeholder="Enter your password"
          autoComplete="current-password"
        />

        <div className="lp-form__row">
          <AppCheckbox
            id="login-remember-me"
            label="Remember me"
            checked={rememberMe}
            onChange={setRememberMe}
          />
          <Button type="button" variant="tertiary" size="sm" onClick={onForgotPassword}>
            Forgot password?
          </Button>
        </div>
      </div>

      {/* Submit */}
      <div className="lp-form__submit-wrap">
        <Button className="pl-[38px] pl-[41px] pl-[45px] pl-[47px] pl-[48px] pl-[49px] pl-[51px] pl-[58px] pl-[59px] pl-[59px] pl-[59px] pl-[59px] pl-[59px] pl-[58px] pl-[53px] pl-[47px] pl-[45px] pl-[40px] pl-[36px] pl-[34px] pl-[30px] pl-[24px] pl-[9px] p-[0px]"
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          loadingText="Signing in…"
          onClick={handleSignIn}
        >
          Sign in
        </Button>
      </div>

      {/* Footer hint */}
      <p className="lp-form__hint">
        Need help signing in?{" "}
        <Button type="button" variant="tertiary" size="sm" onClick={() => openHelp()}>
          Contact support
        </Button>
      </p>
    </div>
  );
}
