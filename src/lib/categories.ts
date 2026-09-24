/**
 * カテゴリの一覧
 *
 * カテゴリの定義は scripts/build-data.mjs が public/data/categories.json に書き出す。
 * ここではそれを読むだけにして、定義の二重管理を避ける。
 */

import fs from "node:fs";
import path from "node:path";

export type Category = {
  slug: string;
  nameJa: string;
  ledeJa: string;
  count: number;
};

const FILE = path.join(process.cwd(), "public", "data", "categories.json");

export function getCategories(): Category[] {
  try {
    const list = JSON.parse(fs.readFileSync(FILE, "utf8")) as Category[];
    // 収録0件のカテゴリは出さない
    return list.filter((c) => c.count > 0);
  } catch {
    return [];
  }
}

/** ビルド時に一度だけ読む */
export const CATEGORIES: Category[] = getCategories();

export function getCategory(slug: string): Category | undefined {
  return getCategories().find((c) => c.slug === slug);
}
