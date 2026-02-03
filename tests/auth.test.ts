import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * 创建 1x1 像素 PNG 图片用于头像上传测试
 * 硬编码二进制数据避免依赖外部文件
 */
function createTestImage(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playwright-"));
  const filePath = path.join(tempDir, "test-avatar.png");
  const pngData = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
    0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xfe, 0xd4, 0x5b, 0x38, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  fs.writeFileSync(filePath, pngData);
  return filePath;
}

/**
 * 生成唯一用户名避免测试间冲突
 * 格式: prefix_timestamp
 */
function generateTestUserName(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}

test.describe("认证模块", () => {
  let avatarPath: string;
  const testUserName = generateTestUserName("test_user");

  // 所有测试前执行：创建测试图片
  test.beforeAll(async () => {
    avatarPath = createTestImage();
  });

  // 每个测试前执行：访问认证页面并等待登录标签
  test.beforeEach(async ({ page }) => {
    await page.goto("http://127.0.0.1:8787/auth");
    await expect(page.locator('input[aria-label="登录"]')).toBeVisible();
  });

  // 每个测试后执行：失败时截图保存到 test-results 目录
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status === "failed") {
      await page.screenshot({
        path: `test-results/failed-${testInfo.title.replace(/\s+/g, "-")}.png`,
        fullPage: true,
      });
    }
  });

  /**
   * 有头像完整流程
   * 测试注册带头像的用户并登录
   */
  test("有头像完整流程", async ({ page }) => {
    await page.click('input[aria-label="注册"]');
    await page.setInputFiles('input[type="file"]', avatarPath);
    await page.fill('input[placeholder="用户名"]', testUserName);
    await page.click('button:has-text("注册")');
    await page.waitForTimeout(500);
    await page.click('input[aria-label="登录"]');
    await expect(page.locator('select[name="user_id"]')).toBeVisible({
      timeout: 10000,
    });
    await page.selectOption('select[name="user_id"]', { label: testUserName });
    await page.click('button:has-text("登录")');
    await page.waitForURL(/\/home\//);
  });

  /**
   * 空用户名验证
   * 测试不输入用户名时显示错误提示
   */
  test("空用户名验证", async ({ page }) => {
    await page.click('input[aria-label="注册"]');
    await page.click('button:has-text("注册")');
    await expect(page.locator(".text-error")).toContainText("用户名不能为空", {
      timeout: 5000,
    });
  });

  /**
   * 重复用户名验证
   * 测试使用已存在的用户名时显示错误提示
   * 先注册一个用户，再次注册相同用户名
   */
  test("重复用户名验证", async ({ page }) => {
    await page.click('input[aria-label="注册"]');
    await page.fill('input[placeholder="用户名"]', testUserName);
    await page.click('button:has-text("注册")');
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="用户名"]', testUserName);
    await page.locator('input[placeholder="用户名"]').press("Tab");
    await page.click('button:has-text("注册")');
    await page.waitForTimeout(1000);
    await expect(page.locator(".text-error")).toContainText("用户名已存在", {
      timeout: 5000,
    });
  });

  /**
   * 未选账户登录验证
   * 测试不选择账户直接登录时显示错误提示
   */
  test("未选账户登录验证", async ({ page }) => {
    await page.click('input[aria-label="登录"]');
    await page.click('button:has-text("登录")');
    await expect(page.locator(".text-error")).toContainText("请选择一个账户", {
      timeout: 5000,
    });
  });

  /**
   * 删除账户功能
   * 测试注册后删除账户，验证用户从列表移除
   */
  test("删除账户功能", async ({ page }) => {
    const deleteUserName = generateTestUserName("delete_user");
    await page.click('input[aria-label="注册"]');
    await page.setInputFiles('input[type="file"]', avatarPath);
    await page.fill('input[placeholder="用户名"]', deleteUserName);
    await page.click('button:has-text("注册")');
    await page.waitForTimeout(500);
    await page.click('input[aria-label="登录"]');
    await expect(page.locator('select[name="user_id"]')).toBeVisible({
      timeout: 10000,
    });
    await page.selectOption('select[name="user_id"]', {
      label: deleteUserName,
    });
    await page.click('button:has-text("删除账户")');
    await page.waitForTimeout(500);
    const options = await page
      .locator('select[name="user_id"] option')
      .allTextContents();
    expect(options).toContain("选择账户");
    expect(options).not.toContain(deleteUserName);
  });
});
