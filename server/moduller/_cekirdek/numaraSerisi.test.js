import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

process.env.ODA_DB_PATH = path.join(os.tmpdir(), `oda_test_${crypto.randomUUID()}.sqlite`);
const { sonraki } = await import('./numaraSerisi.js');

test('aynı seri kodunda numaralar ardışık ilerler', () => {
  assert.equal(sonraki('SAT', 2026), 'SAT-2026-0001');
  assert.equal(sonraki('SAT', 2026), 'SAT-2026-0002');
  assert.equal(sonraki('SAT', 2026), 'SAT-2026-0003');
});

test('farklı seri kodları birbirinden BAĞIMSIZ sayaç tutar', () => {
  sonraki('ODM', 2026);
  assert.equal(sonraki('ODM', 2026), 'ODM-2026-0002');
  assert.equal(sonraki('SAT', 2026), 'SAT-2026-0004', 'SAT sayacı ODM tarafından etkilenmemeli');
});

test('aynı seri kodu farklı yılda 1\'den başlar', () => {
  assert.equal(sonraki('SAT', 2027), 'SAT-2027-0001');
});
