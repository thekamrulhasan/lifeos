import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../public_html/assets/html-escape.js', import.meta.url), 'utf8'), context);
const escape = context.lifeOsHtml.escapeHtml;
test('untrusted text cannot introduce elements or quoted attributes', () => {
  assert.equal(escape('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(escape("' & >"), '&#39; &amp; &gt;');
  assert.equal(escape('سلام'), 'سلام');
  assert.equal(escape(null), '');
  assert.equal(escape(123), '123');
});
