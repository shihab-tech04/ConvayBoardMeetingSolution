import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync("src/styles/globals.css", "utf8");
const loginPage = readFileSync("src/app/pages/auth/LoginPage.tsx", "utf8");
const loginForm = readFileSync("src/app/components/auth/LoginForm.tsx", "utf8");
const releaseWorkflow = readFileSync(".github/workflows/convay-pages.yml", "utf8");

describe("UX-LG-01 responsive Convay login preserves approved desktop UI", () => {
  it("uses the existing 1024px breakpoint and keeps mobile a single form column", () => {
    const mobile = css.slice(css.indexOf("/* ─── Mobile: single column"));
    expect(mobile).toContain("@media (max-width: 1023px)");
    expect(mobile).toContain(".lp-visual {\n    display: none;");
    expect(mobile).toContain("max-width: 100%;");
    expect(mobile).toContain("min-width: 0;");
    expect(mobile).toContain("flex-wrap: wrap;");
    expect(loginPage).toContain("window.innerWidth >= 1024");
    expect(loginPage).toContain("{isDesktop && (");
    expect(loginPage).toContain("<LoginBrandPanel slides={SLIDES} />");
  });

  it("retains both required inputs, sign-in and recovery actions", () => {
    expect(loginForm).toContain('id="login-user-id"');
    expect(loginForm).toContain('id="login-password"');
    expect(loginForm).toContain("Forgot password?");
    expect(loginForm).toContain("Contact support");
    expect(loginForm).toContain("await convayAuth.signIn(userId, password, rememberMe)");
    expect(loginForm).toContain("await reloadAccessSnapshot()");
  });

  it("enforces actual mobile and desktop viewport geometry in deployed browser", () => {
    expect(releaseWorkflow).toContain("for (const width of [320, 375, 768, 1366])");
    expect(releaseWorkflow).toContain("metrics.innerWidth !== width");
    expect(releaseWorkflow).toContain("metrics.pageWidth > width + 1");
    expect(releaseWorkflow).toContain("metrics.visibleVisual !== (width >= 1024)");
    expect(releaseWorkflow).toContain('for (const key of ["auth", "email", "password"])');
    expect(releaseWorkflow).toContain("RESPONSIVE LOGIN PASS");
  });
});
