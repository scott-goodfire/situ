import { describe, expect, test } from "bun:test";

import { contentTypeModule } from ".";

describe("contentTypeModule", () => {
  test("resolves known web asset extensions", () => {
    expect(contentTypeModule.forName({ name: "index.html" })).toBe("text/html; charset=utf-8");
    expect(contentTypeModule.forName({ name: "assets/app.js" })).toBe(
      "text/javascript; charset=utf-8",
    );
    expect(contentTypeModule.forName({ name: "assets/app.mjs" })).toBe(
      "text/javascript; charset=utf-8",
    );
    expect(contentTypeModule.forName({ name: "assets/app.css" })).toBe("text/css; charset=utf-8");
    expect(contentTypeModule.forName({ name: "assets/manifest.json" })).toBe(
      "application/json; charset=utf-8",
    );
    expect(contentTypeModule.forName({ name: "assets/app.js.map" })).toBe(
      "application/json; charset=utf-8",
    );
    expect(contentTypeModule.forName({ name: "assets/logo.svg" })).toBe("image/svg+xml");
    expect(contentTypeModule.forName({ name: "assets/logo.png" })).toBe("image/png");
    expect(contentTypeModule.forName({ name: "assets/photo.jpg" })).toBe("image/jpeg");
    expect(contentTypeModule.forName({ name: "assets/photo.jpeg" })).toBe("image/jpeg");
    expect(contentTypeModule.forName({ name: "assets/photo.webp" })).toBe("image/webp");
    expect(contentTypeModule.forName({ name: "favicon.ico" })).toBe("image/x-icon");
    expect(contentTypeModule.forName({ name: "assets/font.woff2" })).toBe("font/woff2");
    expect(contentTypeModule.forName({ name: "assets/font.woff" })).toBe("font/woff");
  });

  test("normalizes extension case", () => {
    expect(contentTypeModule.forName({ name: "INDEX.HTML" })).toBe("text/html; charset=utf-8");
  });

  test("falls back for unknown extensions", () => {
    expect(contentTypeModule.forName({ name: "download.bin" })).toBe("application/octet-stream");
  });
});
