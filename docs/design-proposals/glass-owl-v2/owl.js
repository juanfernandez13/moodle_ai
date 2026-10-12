const THREE = window.THREE;

const container = document.getElementById('owl-scene');
const motionControl = document.getElementById('motion-toggle');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');

function createScene() {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, .1, 40);
  camera.position.set(0, .25, 8.8);
  camera.lookAt(0, .1, 0);
  scene.add(new THREE.HemisphereLight(0xfafff1, 0x86a18e, 2.1));
  const key = new THREE.DirectionalLight(0xfff9e7, 3.8);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd2edff, 2.2);
  rim.position.set(4, 2, -3);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xf0ffe9, .8);
  fill.position.set(2, -1, 4);
  scene.add(fill);

  const material = (color, roughness = .45) => new THREE.MeshStandardMaterial({ color, roughness, metalness: .02 });
  const sage = material(0x79a985);
  const lightSage = material(0x93bf9a);
  const cream = material(0xf3f0d8);
  const dark = material(0x244537, .32);
  const gold = material(0xe4bd65, .4);
  const white = material(0xffffff, .2);
  const owl = new THREE.Group();
  owl.position.set(.28, -.05, 0);
  owl.rotation.y = -.27;
  scene.add(owl);

  function sphere(parent, mat, radius, position, scale = [1, 1, 1]) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 30), mat);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }
  sphere(owl, sage, .76, [0, -.42, 0], [.92, 1.11, .77]);
  sphere(owl, cream, .58, [0, -.52, .38], [.81, 1.02, .5]);
  sphere(owl, lightSage, .73, [0, .51, .03], [1.12, .93, .89]);
  // Small soft tufts establish the owl silhouette without a detailed texture.
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(.185, .42, 32), lightSage);
    ear.position.set(side * .55, 1.05, -.08);
    ear.rotation.z = side * -.25;
    owl.add(ear);
    const wing = sphere(owl, sage, .36, [side * .69, -.45, -.025], [.44, 1.46, .64]);
    wing.rotation.z = side * -.18;
    sphere(owl, gold, .155, [side * .27, -1.22, .23], [1.19, .44, .86]);
  }
  for (const side of [-1, 1]) {
    sphere(owl, cream, .335, [side * .337, .59, .565], [1.01, 1.13, .4]);
    sphere(owl, dark, .145, [side * .31, .57, .718], [.86, 1.06, .54]);
    sphere(owl, white, .038, [side * .31 - .038, .63, .794]);
    sphere(owl, white, .016, [side * .31 + .035, .535, .793]);
  }
  const beak = new THREE.Mesh(new THREE.ConeGeometry(.128, .25, 32), gold);
  beak.position.set(0, .33, .737);
  beak.rotation.x = Math.PI / 2 + .17;
  beak.scale.z = .8;
  owl.add(beak);
  for (const [x, y] of [[-.18, -.35], [0, -.55], [.18, -.35]]) {
    const feather = sphere(owl, lightSage, .055, [x, y, .675], [.7, 1.32, .22]);
    feather.rotation.z = .08;
  }

  const hat = new THREE.Group();
  hat.position.set(-.04, 1.145, -.035);
  hat.rotation.set(.06, -.15, -.08);
  owl.add(hat);
  const hatBase = new THREE.Mesh(new THREE.CylinderGeometry(.39, .42, .23, 40), dark);
  hatBase.position.y = -.075;
  hat.add(hatBase);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.18, .075, 1.02), dark);
  board.position.y = .085;
  board.rotation.y = .24;
  hat.add(board);
  sphere(hat, dark, .055, [0, .143, 0], [1, .7, 1]);
  const cordCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, .145, 0), new THREE.Vector3(.42, .15, .2),
    new THREE.Vector3(.57, .12, .25), new THREE.Vector3(.64, -.22, .27),
  ]);
  hat.add(new THREE.Mesh(new THREE.TubeGeometry(cordCurve, 28, .014, 8, false), gold));
  const tassel = new THREE.Mesh(new THREE.CylinderGeometry(.027, .047, .16, 18), gold);
  tassel.position.set(.64, -.28, .27);
  hat.add(tassel);

  // Two educational objects orbit quietly behind the character.
  const book = new THREE.Group();
  const pages = new THREE.Mesh(new THREE.BoxGeometry(.35, .09, .42), cream);
  book.add(pages);
  for (const y of [-.065, .065]) {
    const cover = new THREE.Mesh(new THREE.BoxGeometry(.38, .025, .45), material(0xb0c9af));
    cover.position.y = y;
    book.add(cover);
  }
  const spine = new THREE.Mesh(new THREE.BoxGeometry(.025, .14, .45), material(0xa0bea3));
  spine.position.x = -.18;
  book.add(spine);
  book.position.set(-1.15, .6, -.8);
  book.rotation.set(.55, -.5, -.28);
  scene.add(book);
  const pencil = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.042, .042, .5, 6), gold);
  pencil.add(barrel);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.045, .14, 6), cream);
  tip.position.y = -.31;
  tip.rotation.z = Math.PI;
  pencil.add(tip);
  pencil.position.set(1.35, -.2, -.7);
  pencil.rotation.z = -.6;
  scene.add(pencil);

  let paused = motionPreference.matches || motionControl.getAttribute('aria-pressed') === 'true';
  let frame = 0;
  let lastTime = null;
  let elapsed = 0;
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  function render(time) {
    frame = 0;
    if (paused || document.hidden) return;
    if (lastTime !== null) elapsed += Math.min((time - lastTime) / 1000, .05);
    lastTime = time;
    owl.rotation.y = -.27 + elapsed * .11;
    owl.rotation.z = Math.sin(elapsed * .58) * .025;
    owl.position.y = -.05 + Math.sin(elapsed * .8) * .065;
    book.position.y = .6 + Math.sin(elapsed * .7 + 1) * .09;
    book.rotation.y = -.5 + Math.sin(elapsed * .3) * .12;
    pencil.position.y = -.2 + Math.sin(elapsed * .8 + 2) * .07;
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  }
  function updateAnimation() {
    lastTime = null;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (!paused && !document.hidden) frame = requestAnimationFrame(render);
  }
  window.addEventListener('owl-motion', (event) => { paused = event.detail.paused; updateAnimation(); });
  document.addEventListener('visibilitychange', updateAnimation);
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    paused = true;
    updateAnimation();
    container.parentElement.classList.remove('scene-ready');
    renderer.domElement.hidden = true;
  });
  resize();
  container.parentElement.classList.add('scene-ready');
  updateAnimation();
}

try { createScene(); }
catch {
  // A static owl remains visible if WebGL is unavailable. The forms still work.
  container.replaceChildren();
  motionControl.disabled = true;
  motionControl.setAttribute('aria-label', 'Coruja estática: animação 3D indisponível neste navegador');
  motionControl.querySelector('span').textContent = 'Coruja estática';
}
