import { describe, expect, test } from "bun:test";
import { fileNameFromUrl, isSafeFileUrl, normalizePreviewFile } from "./previewFile";

describe("normalizePreviewFile", () => {
  test("nothing to show", () => {
    for (const raw of [undefined, null, "", [], 42, {}, { name: "a.pdf" }]) {
      expect(normalizePreviewFile(raw)).toBeUndefined();
    }
  });

  test("a bare string is a URL, its name read off the path", () => {
    expect(normalizePreviewFile("https://x.test/docs/Q4%20report.pdf?v=2")).toEqual({
      name: "Q4 report.pdf",
      type: "",
      url: "https://x.test/docs/Q4%20report.pdf?v=2",
    });
  });

  test("a bare data URL is content, not a URL", () => {
    expect(normalizePreviewFile("data:image/png;base64,AAAA")).toEqual({
      name: "file",
      type: "",
      data: "data:image/png;base64,AAAA",
    });
  });

  test("reads the default keys, with their fallbacks", () => {
    expect(normalizePreviewFile({ fileName: "a.png", mimeType: "image/png", size: "120", src: "/a.png" })).toEqual({
      name: "a.png",
      type: "image/png",
      size: 120,
      url: "/a.png",
    });
  });

  test("keys override per key, the others keep their defaults", () => {
    const file = normalizePreviewFile(
      { meta: { title: "b.txt" }, url: "/b.txt", title: "ignored" },
      { keys: { name: ["missing", "meta.title"] } },
    );
    expect(file?.name).toBe("b.txt");
    expect(file?.url).toBe("/b.txt");
  });

  test("a list previews its first file", () => {
    expect(normalizePreviewFile([{ name: "a.txt", url: "/a" }, { name: "b.txt", url: "/b" }])?.name).toBe("a.txt");
  });

  test("a non-mime type is dropped: a tree node's `file` is not a mime", () => {
    expect(normalizePreviewFile({ id: "n1", name: "a.pdf", type: "file" }, { urlTemplate: "/f/{{id}}" })?.type).toBe("");
  });

  test("a selected folder previews nothing", () => {
    expect(normalizePreviewFile({ id: "n1", name: "2026", type: "folder" }, { urlTemplate: "/f/{{id}}" })).toBeUndefined();
  });

  test("precedence: data > urlTemplate > keys.url", () => {
    const record = { id: "1", name: "a.png", url: "/own", data: "QUJD" };
    expect(normalizePreviewFile(record, { urlTemplate: "/t/{{id}}" })).toMatchObject({ data: "QUJD" });
    expect(normalizePreviewFile(record, { urlTemplate: "/t/{{id}}" })?.url).toBeUndefined();
    expect(normalizePreviewFile({ ...record, data: undefined }, { urlTemplate: "/t/{{id}}" })?.url).toBe("/t/1");
    expect(normalizePreviewFile({ ...record, data: undefined })?.url).toBe("/own");
  });

  test("a template with a blank placeholder falls back to keys.url", () => {
    expect(normalizePreviewFile({ name: "a.png", url: "/own" }, { urlTemplate: "/t/{{id}}" })?.url).toBe("/own");
    expect(normalizePreviewFile({ name: "a.png" }, { urlTemplate: "/t/{{id}}" })).toBeUndefined();
  });

  test("a bare string fills {{value}}", () => {
    expect(normalizePreviewFile("n 7", { urlTemplate: "/f/{{value}}/content" })?.url).toBe("/f/n%207/content");
  });

  test("root-relative URLs join the API base; others are left alone", () => {
    const baseUrl = "https://api.test/";
    expect(normalizePreviewFile("/a.pdf", { baseUrl })?.url).toBe("https://api.test/a.pdf");
    expect(normalizePreviewFile({ name: "a.pdf", url: "/a.pdf" }, { baseUrl })?.url).toBe("https://api.test/a.pdf");
    expect(normalizePreviewFile("//cdn.test/a.pdf", { baseUrl })?.url).toBe("//cdn.test/a.pdf");
    expect(normalizePreviewFile("https://cdn.test/a.pdf", { baseUrl })?.url).toBe("https://cdn.test/a.pdf");
  });

  test("an upload whose data is a remote URL is a URL", () => {
    expect(normalizePreviewFile({ name: "a.png", type: "image/png", data: "/uploads/a.png" }, { baseUrl: "https://api.test" })).toEqual({
      name: "a.png",
      type: "image/png",
      url: "https://api.test/uploads/a.png",
    });
  });

  test("raw base64 and bytes stay content", () => {
    // Base64 of a JPEG starts with a slash, and must not be read as a path.
    const jpeg = "/9j/".padEnd(68, "A");
    expect(normalizePreviewFile({ name: "a.jpg", data: jpeg })?.data).toBe(jpeg);
    expect(normalizePreviewFile({ name: "a.bin", data: [1, 2] })?.data).toEqual([1, 2]);
  });

  describe("blurhash", () => {
    const HASH = "LEHV6nWB2yk8pyo0adR*.7kCMdnj";
    const OTHER = "LXI_Rx2gw#SjsqWrjtfRfQfQfQfQ";
    const record = { name: "a.png", url: "/a.png" };

    test("comes from the record, then the option", () => {
      expect(normalizePreviewFile({ ...record, blurHash: HASH })?.blurhash).toBe(HASH);
      expect(normalizePreviewFile({ ...record, thumb: { hash: HASH } }, { keys: { blurhash: "thumb.hash" } })?.blurhash).toBe(HASH);
      expect(normalizePreviewFile({ ...record, blurhash: HASH }, { blurhash: OTHER })?.blurhash).toBe(HASH);
      expect(normalizePreviewFile("/a.png", { blurhash: OTHER })?.blurhash).toBe(OTHER);
    });

    test("blank or invalid is none", () => {
      expect(normalizePreviewFile("/a.png", { blurhash: "" })).not.toHaveProperty("blurhash");
      expect(normalizePreviewFile({ ...record, blurhash: "not a hash" })).not.toHaveProperty("blurhash");
    });

    test("showBlurhash: false drops it", () => {
      expect(normalizePreviewFile({ ...record, blurhash: HASH }, { showBlurhash: false, blurhash: OTHER })).not.toHaveProperty("blurhash");
    });
  });

  describe("image size", () => {
    const record = { name: "a.png", url: "/a.png" };

    test("comes from the record, numbers or numeric text, by the default or a configured key", () => {
      expect(normalizePreviewFile({ ...record, width: 640, height: 360 })).toMatchObject({ width: 640, height: 360 });
      expect(normalizePreviewFile({ ...record, imageWidth: "64", imageHeight: "36" })).toMatchObject({ width: 64, height: 36 });
      expect(normalizePreviewFile({ ...record, meta: { w: 4, h: 3 } }, { keys: { width: "meta.w", height: "meta.h" } })).toMatchObject({ width: 4, height: 3 });
    });

    test("one side alone, or a side that isn't positive, is no size", () => {
      for (const extra of [{ width: 640 }, { height: 360 }, { width: 0, height: 360 }, { width: 640, height: -1 }, { width: "wide", height: 360 }]) {
        const file = normalizePreviewFile({ ...record, ...extra });
        expect(file).not.toHaveProperty("width");
        expect(file).not.toHaveProperty("height");
      }
    });
  });

  test("an unsafe scheme never reaches the DOM", () => {
    expect(normalizePreviewFile("javascript:alert(1)")).toBeUndefined();
    expect(normalizePreviewFile({ name: "a.pdf", url: "java\nscript:alert(1)" })).toBeUndefined();
    expect(normalizePreviewFile({ name: "a.pdf", url: "vbscript:x" })).toBeUndefined();
  });
});

describe("isSafeFileUrl", () => {
  test("web schemes and relative URLs only", () => {
    for (const url of ["https://a.test/x", "http://a.test/x", "blob:http://a.test/1", "/x", "x.pdf", "//a.test/x"]) {
      expect(isSafeFileUrl(url)).toBe(true);
    }
    for (const url of ["javascript:alert(1)", " JavaScript:alert(1)", "java\tscript:alert(1)", "file:///etc/passwd"]) {
      expect(isSafeFileUrl(url)).toBe(false);
    }
  });
});

describe("fileNameFromUrl", () => {
  test("the decoded last segment, without the query", () => {
    expect(fileNameFromUrl("/files/a%20b.pdf?x=1#y")).toBe("a b.pdf");
    expect(fileNameFromUrl("https://a.test/")).toBeUndefined();
  });
});
