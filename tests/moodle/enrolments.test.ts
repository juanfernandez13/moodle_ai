import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MoodleClient } from '../../src/server/moodle/client.ts';
import { previewStudents } from '../../src/server/moodle/students.ts';
import { buildStudentPreview } from '../../src/domain/students/index.ts';
import { studentFixture,studentRow } from './fixtures.ts';

test('student preview shows real enrol role and refuses missing/manual teacher defaults before upload', async () => {
  for(const mode of ['student','teacher','missing'] as const) {
    const upload=studentFixture(),row={...studentRow,course:'LAB'},options={mode:'update' as const,enrol:true};
    const client=new MoodleClient('http://localhost:3211',{fetch:async(input,init)=>{
      const url=new URL(String(input));
      if(url.pathname.startsWith('/course/')||url.pathname.startsWith('/enrol/')||url.pathname.startsWith('/admin/roles/'))assert.notEqual(init?.method,'POST');
      if(url.pathname==='/course/search.php')return new Response(`<div class='coursebox'><div class='coursename'><a href='/course/view.php?id=4'>Lab</a></div></div>`);
      if(url.pathname==='/course/edit.php')return new Response(`<input name='shortname' value='LAB'>`);
      if(url.pathname==='/enrol/instances.php')return new Response(mode==='missing'?'No methods':`<a href='/enrol/editinstance.php?courseid=4&id=13&type=manual'>Edit</a>`);
      if(url.pathname==='/enrol/editinstance.php')return new Response(`<form method='post'><input name='id' value='13'><input name='status' value='0'><input name='roleid' value='5'><input name='enrolperiod[number]' value='0'><input name='enrolperiod[timeunit]' value='86400'><input name='expirynotify' value='0'></form>`);
      if(url.pathname==='/admin/roles/define.php')return new Response(`<select name='archetype'><option selected value='${mode}'>${mode}</option></select>`);
      return upload.fetch(input,init);
    }});
    const reviewed=await buildStudentPreview([row],options);assert.ok(reviewed.ok);
    if(mode==='student') {
      const preview=await previewStudents(client,[row],options,reviewed.preview.hash);
      assert.deepEqual(preview.effectiveOptions.enrolments,[{courseId:4,shortName:'LAB',enrolId:13,method:'manual',roleId:5,role:'student',durationSeconds:0,expiryNotify:false}]);
    } else await assert.rejects(previewStudents(client,[row],options,reviewed.preview.hash),(error: unknown)=>typeof error==='object'&&error!==null&&'code'in error&&error.code===(mode==='teacher'?'unsafe_enrol_role':'manual_enrol_missing'));
    assert.equal(upload.confirms(),0);
  }
});
