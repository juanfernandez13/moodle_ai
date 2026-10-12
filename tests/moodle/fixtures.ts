export const studentRow = { id:'one',rowNumber:2,original:{},username:'lab-test-one',firstName:'Fictício',lastName:'Um',email:'one@example.invalid',cpf:'',course:'' };
export const dateInput = { startDate:'2030-01-07',unitCount:1,daysPerUnit:7,opensAtTime:'08:00',closesAtTime:'18:00',timezoneOffsetMinutes:-180 };
const encode = (value: string) => value.replaceAll('&','&amp;').replaceAll("'",'&#39;').replaceAll('<','&lt;');
export function dateFixture(options: { partial?: boolean; timeout?: boolean; drift?: boolean; filemanager?: boolean; restrictedYears?: boolean; relativeAction?: boolean } = {}): { fetch: typeof fetch; posts: string[]; states: Map<string,Record<string,string>> } {
  let reads = 0, courseReads = 0;
  const states = new Map<string,Record<string,string>>([
    ['2',{id:'2',_qf__editsection_form:'1',sesskey:'private',name:'Unit',availabilityconditionsjson:'',summary:'keep'}],
    ['4',{id:'4',coursemodule:'4',sesskey:'private',name:'Discuss',availabilityconditionsjson:'',grade:'70'}],
    ['5',{id:'5',coursemodule:'5',sesskey:'private',name:'Quiz',availabilityconditionsjson:'',grade:'90',...Object.fromEntries(['timeopen','timeclose'].flatMap(prefix=>Object.entries({year:'2026',month:'10',day:'12',hour:'8',minute:'0',enabled:'0'}).map(([k,v])=>[`${prefix}[${k}]`,v])))}]
  ]);
  const posts: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    if (!url.pathname.startsWith('/course/') && !url.pathname.startsWith('/user/')) return new Response('Not found',{status:404});
    if (url.pathname.includes('/user/edit')) return new Response(`<form method='post'><select name='timezone'><option selected value='Europe/London'>London</option></select></form>`);
    if (url.pathname.includes('/course/view')) { courseReads++; return new Response(`<h1>Lab</h1><li id='section-0' data-number='0' data-id='1'></li><li id='section-1' data-number='1' data-id='2'><h3 class='sectionname'>Unit</h3><ul><li id='module-4' class='modtype_forum'><span class='instancename'>Discuss</span></li><li id='module-5' class='modtype_quiz'><span class='instancename'>Quiz</span></li></ul></li>`); }
    const id = url.searchParams.get('id') ?? url.searchParams.get('update') ?? new URLSearchParams(String(init?.body)).get('id')!;
    if (init?.method === 'POST') {
      posts.push(id);
      if (options.timeout) return await new Promise<Response>(() => {});
      if (options.partial && id === '4') return new Response(`<div class='alert-danger'>Rejected private data</div>`);
      const parsed = Object.fromEntries(new URLSearchParams(String(init.body))); delete parsed.submitbutton; states.set(id, parsed);
      return new Response('Saved');
    }
    const current = { ...states.get(id)! };
    if (options.drift && courseReads > 1 && id === '4') current.name = 'Changed elsewhere';
    if (options.filemanager && id === '5') current.filemanager_sebconfigfile = String(++reads);
    const fields = Object.entries(current).map(([name,value]) => options.restrictedYears && name.endsWith('[year]') ? `<select name='${name}'><option value='2026' ${value === '2026' ? 'selected' : ''}>2026</option></select>` : `<input name='${name}' value='${encode(value)}'>`).join('');
    return new Response(`<form action='${options.relativeAction ? '' : 'http://localhost:3211/course/'}${id==='2'?'editsection':'modedit'}.php' method='post'>${fields}<input type='submit' name='submitbutton' value='Save'></form>`);
  };
  return { fetch: fetcher, posts, states };
}

export function studentFixture(options: { timeout?: boolean; missingRepository?: boolean; pending?: boolean; error?: boolean } = {}): { fetch: typeof fetch; confirms: () => number; calls: () => number } {
  let count=0, confirms=0;
  const names=['uutype','uupasswordnew','uuupdatetype','uupasswordold','uumatchemail','uuallowdeletes','uuallowrenames','uuallowsuspends','uubulk','uustandardusernames'];
  const selects=names.map(name=>`<select name='${name}'>${['0','1','2','3'].map(value=>`<option value='${value}'>${value}</option>`).join('')}</select>`).join('');
  const fetcher: typeof fetch=async(input,init)=>{
    count++;const url=new URL(String(input)),body=new URLSearchParams(String(init?.body));
    if(url.pathname.includes('/login/index'))return new Response(init?.method==='POST'?`<script>M.cfg={"sesskey":"private"};</script><span class='usertext'>Lab Admin</span>`:`<form id='login'><input name='logintoken' value='fake'></form>`);
    if(url.pathname==='/my/')return new Response(`<script>M.cfg={"sesskey":"private"};</script>`);
    if(url.pathname.includes('repository_ajax'))return new Response(JSON.stringify({id:'201'}));
    if(init?.method!=='POST')return new Response(`<script>${options.missingRepository?'':'const configuration={"id":"9","name":"Upload","type":"upload"};'}</script><form action='index.php' method='post'><input name='userfile' value='201'><input name='sesskey' value='private'><input name='_qf__admin_uploaduser_form1' value='1'><select name='delimiter_name'><option value='comma'>Comma</option></select><select name='encoding'><option value='UTF-8'>UTF</option></select><select name='previewrows'><option value='100000'>All</option></select><input name='submitbutton' type='submit' value='Upload'></form>`);
    if(body.has('uutype')){
      confirms++;if(options.timeout)return await new Promise<Response>(()=>{});
      if(body.get('uutype')==='0'&&body.get('uuupdatetype')!=='0')return new Response(`<form><select name='uutype'><option>0</option></select><div class='invalid-feedback'>This option cannot be selected with the chosen upload type.</div></form>`);
      const status=body.get('uutype')==='3'?'User account updated':'New user';
      return new Response(`<table id='uuresults'><tr><td><span class='${options.error?'uuerror':'uunormal'}'>${status}</span></td><td>2</td><td>7</td><td>lab-test-one</td><td>Private HTML details never returned</td></tr></table>`);
    }
    return new Response(`<table id='uupreview'><tr><th>CSV line</th><th>username</th><th>firstname</th><th>lastname</th><th>email</th><th>idnumber</th><th>Status</th></tr><tr><td>2</td><td>lab-test-one</td><td>Fictício</td><td>Um</td><td>one@example.invalid</td><td></td><td>${options.pending?'Duplicate personal email':' '}</td></tr></table><form action='index.php' method='post'><input name='iid' value='5'><input name='sesskey' value='private'><input name='_qf__admin_uploaduser_form2' value='1'><input name='uunoemailduplicates' value='1'>${selects}<input name='city' value=''><input name='submitbutton' type='submit' value='Upload'></form>`);
  };
  return {fetch:fetcher,confirms:()=>confirms,calls:()=>count};
}
