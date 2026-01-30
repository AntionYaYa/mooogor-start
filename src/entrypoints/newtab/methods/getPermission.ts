export type Permission = "bookmarks" | "history";

export async function hasPermission(permission: Permission): Promise<boolean> {
  return await browser.permissions.contains({
    permissions: [permission],
  });
}

export async function requestPermission(permission: Permission): Promise<boolean> {
  return await browser.permissions.request({
    permissions: [permission],
  });
}
