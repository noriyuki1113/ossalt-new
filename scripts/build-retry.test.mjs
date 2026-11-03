import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFontFetchFailure, MAX_ATTEMPTS } from './build-retry.mjs';

test('Google Fonts の取得失敗（2026-11-03 の実ログの形）は再試行の対象', () => {
  const log = 'at <unknown> (https://nextjs.org/docs/messages/module-not-found)\nat <unknown> ([next]/internal/font/google/noto_sans_jp_cf347af5.module.css:2902:8)';
  assert.equal(isFontFetchFailure(log), true);
  assert.equal(isFontFetchFailure('Failed to fetch `Noto Sans JP` from Google Fonts. next/font error'), true);
});

test('型エラー・テストの失敗・フォントと無関係な module-not-found は再試行しない', () => {
  assert.equal(isFontFetchFailure('Type error: Property x does not exist'), false);
  assert.equal(isFontFetchFailure("Module not found: Can't resolve './missing' module-not-found"), false);
  assert.equal(isFontFetchFailure('Failed to fetch https://example.com/data.json'), false);
  assert.equal(isFontFetchFailure(''), false);
  assert.equal(isFontFetchFailure(undefined), false);
});

test('再試行は最大3回', () => assert.equal(MAX_ATTEMPTS, 3));
