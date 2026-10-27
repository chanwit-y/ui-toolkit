import { describe, expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { splitGummyTheme, ThemeProvider, useTheme } from "./ThemeProvider";

/**
 * The surface token (grilled design `glass-surface`): `surface` / `background`
 * are Gummy's, never Radix's; the Theme root carries `data-surface` and the
 * backdrop var; a nested provider inherits unless it sets its own.
 */
function Probe({ id }: { id: string }) {
  const { surface, theme } = useTheme();
  return <i id={id} data-s={surface} data-bg={theme?.background ?? ""} />;
}

const attr = (html: string, id: string, name: string) => {
  const m = new RegExp(`<i id="${id}" data-s="([^"]*)" data-bg="([^"]*)"`).exec(html);
  if (!m) throw new Error(`no probe ${id} in ${html}`);
  return name === "s" ? m[1] : m[2];
};

describe("ThemeProvider surface", () => {
  test("defaults to flat and marks the Radix root", () => {
    const html = renderToString(
      <ThemeProvider components={{}}>
        <Probe id="p" />
      </ThemeProvider>,
    );
    expect(html).toContain('data-surface="flat"');
    expect(attr(html, "p", "s")).toBe("flat");
    expect(html).not.toContain("--gummy-backdrop");
  });

  test("glass sets data-surface and puts the configured background on the root var", () => {
    const html = renderToString(
      <ThemeProvider theme={{ surface: "glass", background: "url(/sky.jpg)" }} components={{}}>
        <Probe id="p" />
      </ThemeProvider>,
    );
    expect(html).toContain('data-surface="glass"');
    expect(html).toContain("--gummy-backdrop:url(/sky.jpg)");
    expect(attr(html, "p", "bg")).toBe("url(/sky.jpg)");
  });

  test("the background is not written while flat", () => {
    const html = renderToString(
      <ThemeProvider theme={{ background: "red" }} components={{}}>
        <Probe id="p" />
      </ThemeProvider>,
    );
    expect(html).not.toContain("--gummy-backdrop");
  });

  test("a nested provider inherits the surface unless it sets its own", () => {
    const html = renderToString(
      <ThemeProvider theme={{ surface: "glass" }} components={{}}>
        <ThemeProvider components={{}}>
          <Probe id="inherit" />
        </ThemeProvider>
        <ThemeProvider theme={{ surface: "flat" }} components={{}}>
          <Probe id="own" />
        </ThemeProvider>
      </ThemeProvider>,
    );
    expect(attr(html, "inherit", "s")).toBe("glass");
    expect(attr(html, "own", "s")).toBe("flat");
  });

  test("splitGummyTheme strips the two keys for Radix", () => {
    expect(splitGummyTheme({ accentColor: "iris", surface: "glass", background: "red" })).toEqual({
      radix: { accentColor: "iris" },
      surface: "glass",
      background: "red",
    });
    expect(splitGummyTheme(undefined)).toEqual({ radix: undefined });
  });
});
