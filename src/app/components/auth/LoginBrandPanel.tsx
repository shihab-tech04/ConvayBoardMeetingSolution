import { LoginSlider } from "./LoginSlider";
import type { SlideData } from "../../pages/auth/LoginPage";

interface LoginBrandPanelProps {
  slides: SlideData[];
}

export function LoginBrandPanel({ slides }: LoginBrandPanelProps) {
  return (
    <div className="lp-visual__inner">
      <LoginSlider slides={slides} />
    </div>
  );
}
