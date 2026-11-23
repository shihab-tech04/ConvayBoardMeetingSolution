import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync("index.html", "utf8");
const favicon = readFileSync("public/favicon.svg", "utf8");
const logo = readFileSync("src/app/components/navigation/NCCBankBoardLogo.tsx", "utf8");

describe("Convay SVG favicon matches the approved navigation logo", () => {
  it("advertises an SVG favicon that follows Vite's production base path", () => {
    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg" />');
    expect(html.match(/rel="icon"/g)).toHaveLength(1);
    expect("https://shihab-tech04.github.io/ConvayBoardMeetingSolution/favicon.svg")
      .toContain("/ConvayBoardMeetingSolution/favicon.svg");
  });

  it("keeps all three canonical logo paths identical to the in-app SVG", () => {
    const document = new DOMParser().parseFromString(favicon, "image/svg+xml");
    expect(document.querySelector("parsererror")).toBeNull();
    expect(document.documentElement.getAttribute("viewBox")).toBe("0 0 32 32");
    const iconPaths = Array.from(document.querySelectorAll("path"));
    const sourcePaths = [...logo.matchAll(/<path\b([^>]+)\/>/g)];
    expect(iconPaths).toHaveLength(3);
    expect(sourcePaths).toHaveLength(3);
    iconPaths.forEach((path, i) => {
      const d = sourcePaths[i][1].match(/d="([^"]+)"/)?.[1];
      expect(path.getAttribute("d")).toBe(d);
      expect(path.getAttribute("fill")).toBe("#382C83");
      expect(path.getAttribute("stroke")).toBe("#382C83");
    });
  });
});
