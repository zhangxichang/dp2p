import { test, expect } from "@playwright/test";

test("Index 路由加载性能", async ({ page }) => {
  await page.goto("http://127.0.0.1:8787", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(200);

  const metrics = await page.evaluate(() => {
    const paint = performance.getEntriesByType("paint");
    const fcp =
      paint.find((e) => e.name === "first-contentful-paint")?.startTime ?? 0;
    const lcpEntry = performance
      .getEntriesByType("largest-contentful-paint")
      ?.sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0))[0];
    const lcp = lcpEntry?.startTime ?? 0;
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const ttfb = navigation?.responseStart ?? 0;
    const domInteractive = navigation?.domInteractive ?? 0;
    const domComplete = navigation?.domComplete ?? 0;
    const loadEventEnd = navigation?.loadEventEnd ?? 0;
    return {
      ttfb,
      fcp,
      lcp,
      domInteractive,
      domComplete,
      loadEventEnd,
    };
  });

  console.table(metrics);
  expect(metrics.ttfb).toBeLessThan(500);
  expect(metrics.fcp).toBeLessThan(1500);
  expect(metrics.lcp).toBeLessThan(2500);
  expect(metrics.domInteractive).toBeLessThan(2000);
  expect(metrics.loadEventEnd).toBeLessThan(3000);
});

test("第二层路由（auth）加载性能", async ({ page }) => {
  const startTime = Date.now();
  await page.goto("http://127.0.0.1:8787/auth", {
    waitUntil: "domcontentloaded",
  });
  const authLoaded = Date.now();

  await page.waitForTimeout(200);

  const metrics = {
    authLoad: authLoaded - startTime,
  };

  console.table(metrics);
  expect(metrics.authLoad).toBeLessThan(2000);
});
