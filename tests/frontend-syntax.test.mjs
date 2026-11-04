import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

function scripts(directory) {
  return fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? scripts(file) : /\.(m?js)$/.test(file) ? [file] : [];
  });
}
test('every shipped browser script parses', () => {
  for (const file of scripts(fileURLToPath(new URL('../public_html', import.meta.url)))) {
    const result = spawnSync(process.execPath, ['--check', file], {encoding:'utf8'});
    assert.equal(result.status, 0, result.stderr || file);
  }
});
