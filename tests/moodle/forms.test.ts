import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readForm } from '../../src/server/moodle/forms.ts';

test('form preserves ordered successful fields and select/checkbox rules without executing HTML', () => {
  const form = readForm(`<form action='/edit'><input name='enabled' value='0' type='hidden'><input name='enabled' type='checkbox' checked value='1'><input disabled name='ignored' value='x'><fieldset disabled><input name='alsoIgnored' value='x'></fieldset><select name='choice'><option disabled value='bad'>X</option><option value='first'>A</option></select><select name='many' multiple><option selected value='a'>A</option><option selected value='b'>B</option></select><textarea name='text'>&lt;script&gt;alert(1)&lt;/script&gt;</textarea><input type='submit' name='save' value='Save'></form>`, 'form');
  assert.deepEqual(form.fields.pairs, [['enabled','0'],['enabled','1'],['choice','first'],['many','a'],['many','b'],['text','<script>alert(1)</script>']]);
  form.fields.set('enabled', '0');
  assert.deepEqual(form.fields.pairs.slice(0,2), [['enabled','0'],['enabled','0']]);
});
