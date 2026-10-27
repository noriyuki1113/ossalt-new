import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, newEntry, dueEntries, recordOutcome, renderLedger, validateEntry } from './seo-ledger.mjs';

const base = { date: '2026-11-02', url: 'https://ossalt.jp/alternatives/notion/', query: 'notion 代替', change: 'titleの見直し', pr: 'https://github.com/noriyuki1113/ossalt-new/pull/50', window: '2026-08-01〜2026-10-31（Web・日本）' };

test('確認期限は公開日の28日後・90日後', () => {
  assert.equal(addDays('2026-11-02', 28), '2026-11-30');
  assert.equal(addDays('2026-11-02', 90), '2027-01-31');
  const e = newEntry({ entries: [] }, base);
  assert.equal(e.id, 1);
  assert.equal(e.check28, '2026-11-30');
  assert.equal(e.outcome28, null);
});

test('不正な日付・URL・PR・数値の記述は拒否する', () => {
  assert.throws(() => validateEntry({ ...base, date: '2026-02-30' }), /存在しない日付/);
  assert.throws(() => validateEntry({ ...base, url: 'https://evil.example/' }), /OSSALTのURL/);
  assert.throws(() => validateEntry({ ...base, pr: 'https://example.com/pr/1' }), /PRのURL/);
  assert.throws(() => validateEntry({ ...base, change: '' }), /必須/);
  assert.throws(() => validateEntry({ ...base, note: 'クリック 120 に増加' }), /数値/);
});

test('期限を過ぎた未確認の項目だけが due に出て、記録すると消える', () => {
  const ledger = { entries: [] };
  ledger.entries.push(newEntry(ledger, base));
  assert.deepEqual(dueEntries(ledger, '2026-11-29'), []);
  const d = dueEntries(ledger, '2026-12-05');
  assert.equal(d.length, 1);
  assert.equal(d[0].stage, 28);
  assert.equal(d[0].overdueDays, 5);
  recordOutcome(ledger, { id: 1, stage: 28, outcome: 'flat', note: '期間中に他の変更なし' });
  assert.deepEqual(dueEntries(ledger, '2026-12-05'), []);
  assert.equal(dueEntries(ledger, '2027-02-01').length, 1);
  assert.throws(() => recordOutcome(ledger, { id: 9, stage: 28, outcome: 'flat' }), /記録がありません/);
  assert.throws(() => recordOutcome(ledger, { id: 1, stage: 28, outcome: 'great' }), /outcome/);
});

test('台帳のMarkdownは、記録が無くても作れ、数値の列を持たない', () => {
  assert.match(renderLedger({ entries: [] }), /まだ公開した変更はありません/);
  const ledger = { entries: [] };
  ledger.entries.push(newEntry(ledger, base));
  const md = renderLedger(ledger);
  assert.match(md, /2026-11-30（未確認）/);
  assert.doesNotMatch(md, /クリック数|表示回数/);
});
