(() => {
  'use strict';
  const THREE = window.THREE;
  const container = document.getElementById('field-scene');
  try {
    const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.append(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, 1, .1, 240);
    camera.position.set(0, 2.8, 17); camera.lookAt(0, 5.5, -45);
    let seed = 9381;
    function random() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    function height(x, z) { return 1.8 * Math.exp(-x*x/850-(z+28)*(z+28)/700) + .18 * Math.sin(x*.13) * Math.cos(z*.12); }
    const day = { value: document.documentElement.dataset.theme === 'dark' ? 0 : 1 };
    const time = { value: 0 };
    const skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { day, time },
      vertexShader: 'varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform float day; uniform float time; varying vec3 direction;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
        void main(){vec3 d=normalize(direction);float y=clamp(d.y*2.4,0.,1.);
          vec3 dusk=mix(vec3(.30,.40,.38),vec3(.045,.10,.16),pow(y,.6));
          vec3 morning=mix(vec3(.83,.89,.77),vec3(.34,.60,.79),pow(y,.6));
          vec3 color=mix(dusk,morning,day);
          vec2 p=d.xz/(max(d.y,.12))*1.8+vec2(time*.002,0.);
          float n=noise(p)*.55+noise(p*2.1)*.3+noise(p*4.3)*.15;
          float cloud=smoothstep(.51,.70,n)*smoothstep(.03,.15,d.y)*(1.-smoothstep(.55,.9,d.y));
          color=mix(color,mix(vec3(.35,.44,.47),vec3(.95,.97,.92),day),cloud*mix(.18,.7,day));
          gl_FragColor=vec4(color,1.);
          #include <colorspace_fragment>
        }`
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(180, 24, 16), skyMaterial));
    const groundGeometry = new THREE.PlaneGeometry(140, 160, 100, 100);
    groundGeometry.rotateX(-Math.PI/2); groundGeometry.translate(0,0,-50);
    const vertices = groundGeometry.attributes.position;
    for (let i=0; i<vertices.count; i++) vertices.setY(i,height(vertices.getX(i),vertices.getZ(i)));
    groundGeometry.computeVertexNormals();
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x243e25 });
    scene.add(new THREE.Mesh(groundGeometry, groundMaterial));
    // A shared ribbon with per blade attributes keeps thousands of blades in one draw call.
    const count = matchMedia('(max-width: 760px)').matches ? 26000 : 75000;
    const geometry = new THREE.InstancedBufferGeometry();
    const positions = [], indices = [];
    for (let i=0;i<4;i++) { const y=i/3, width=1-y*.96; positions.push(-width,y,0,width,y,0); if(i<3) { const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2); } }
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); geometry.setIndex(indices);
    const offsets = new Float32Array(count*3), traits = new Float32Array(count*4);
    for (let i=0;i<count;i++) {
      const x=(random()-.5)*115, z=18-Math.pow(random(),1.8)*115;
      offsets.set([x,height(x,z),z],i*3);
      traits.set([.24+random()*.40,.017+random()*.026,random()*Math.PI*2,random()],i*4);
    }
    geometry.setAttribute('offset',new THREE.InstancedBufferAttribute(offsets,3));
    geometry.setAttribute('traits',new THREE.InstancedBufferAttribute(traits,4)); geometry.instanceCount=count;
    const grassMaterial = new THREE.ShaderMaterial({
      side: THREE.DoubleSide, uniforms: { day,time },
      vertexShader: `attribute vec3 offset;attribute vec4 traits;uniform float time;varying float tip;varying float shade;varying float distanceToCamera;
        void main(){tip=position.y;shade=traits.w;vec3 p=vec3(position.x*traits.y,position.y*traits.x,0.);
          p.xz=mat2(cos(traits.z),-sin(traits.z),sin(traits.z),cos(traits.z))*p.xz;
          p.x+=sin(time*.85+offset.z*.48+offset.x*.22)*.14*tip*tip;
          p.z+=sin(traits.z)*.12*tip*tip;p+=offset;
          vec4 mv=modelViewMatrix*vec4(p,1.);distanceToCamera=-mv.z;gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `uniform float day;varying float tip;varying float shade;varying float distanceToCamera;
        void main(){vec3 base=mix(vec3(.025,.065,.035),vec3(.045,.12,.02),day);
          vec3 top=mix(vec3(.08,.16,.07),vec3(.13,.33,.055),day);
          vec3 color=mix(base,top,pow(tip,.7))*(.74+shade*.44);
          vec3 fog=mix(vec3(.22,.33,.27),vec3(.66,.76,.53),day);
          color=mix(color,fog,smoothstep(35.,135.,distanceToCamera)*.65);
          gl_FragColor=vec4(color,1.);
          #include <colorspace_fragment>
        }`
    });
    const grass = new THREE.Mesh(geometry,grassMaterial); grass.frustumCulled=false;scene.add(grass);
    const ambient = new THREE.HemisphereLight(0xe0ebdc,0x243e21,2);
    const sunlight = new THREE.DirectionalLight(0xffedd0,2.5); sunlight.position.set(-20,30,20); scene.add(ambient,sunlight);
    const bark = new THREE.MeshStandardMaterial({color:0x545648,roughness:1});
    const leafMaterial = new THREE.MeshStandardMaterial({color:0x42653b,roughness:1});
    const tree = new THREE.Group(); tree.position.set(15,height(15,-28),-28);scene.add(tree);
    function branch(from,to,radius) {
      const a=new THREE.Vector3(...from), b=new THREE.Vector3(...to), direction=b.clone().sub(a);
      const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius*.6,radius,direction.length(),10),bark);
      mesh.position.copy(a.add(b).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());tree.add(mesh);
    }
    branch([0,0,0],[0,5.6,0],.32);
    for(let i=0;i<13;i++) {
      const angle=random()*Math.PI*2, reach=1.6+random()*2.0, y=4.0+random()*2.9;
      const x=Math.cos(angle)*reach,z=Math.sin(angle)*reach;
      branch([0,2.8+i*.16,0],[x,y,z],.11);
      const leaf=new THREE.Mesh(new THREE.IcosahedronGeometry(1,2),leafMaterial);
      leaf.position.set(x,y,z);leaf.scale.set(1.5+random(),1.1+random()*.7,1.4+random());tree.add(leaf);
    }
    let paused=document.getElementById('motion-toggle').getAttribute('aria-pressed')==='true';
    let frame=0,last=null,elapsed=0;
    let fieldVisible=document.documentElement.dataset.scene==='field';
    function render(){ renderer.render(scene,camera); }
    function setTheme(theme) {
      day.value=theme==='dark'?0:1;
      groundMaterial.color.set(theme==='dark'?0x162b1a:0x376127);
      ambient.intensity=theme==='dark'?.6:2;
      sunlight.intensity=theme==='dark'?.35:2.5;
      render();
    }
    function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();render();}
    function animate(now){frame=0;if(paused||document.hidden||!fieldVisible)return;if(last!==null)elapsed+=Math.min((now-last)/1000,.05);last=now;time.value=elapsed;render();frame=requestAnimationFrame(animate);}
    function update(){if(frame)cancelAnimationFrame(frame);frame=0;last=null;if(!paused&&!document.hidden&&fieldVisible)frame=requestAnimationFrame(animate);}
    window.addEventListener('resize',resize);
    window.addEventListener('owl-theme',event=>setTheme(event.detail.theme));
    window.addEventListener('owl-motion',event=>{paused=event.detail.paused;update();});
    window.addEventListener('owl-background',event=>{fieldVisible=event.detail.scene==='field';if(fieldVisible)resize();update();});
    document.addEventListener('visibilitychange',update);
    renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();paused=true;update();renderer.domElement.hidden=true;container.parentElement.classList.remove('field-ready');});
    setTheme(document.documentElement.dataset.theme);resize();container.parentElement.classList.add('field-ready');update();
  } catch { container.replaceChildren(); }
})();
