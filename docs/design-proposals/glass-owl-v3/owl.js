(() => {
  'use strict';
  const THREE = window.THREE;
  const container = document.getElementById('owl-scene');
  const control = document.getElementById('motion-toggle');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  try {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    container.append(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, .1, 30);
    camera.position.set(0, .15, 4.8);
    camera.lookAt(0, .1, 0);
    const ambient = new THREE.HemisphereLight(0xffffff, 0x6e7775, 2.4);
    const key = new THREE.DirectionalLight(0xffffff, 3.1);
    key.position.set(-3, 4, 5);
    const rim = new THREE.DirectionalLight(0xe7efff, 2);
    rim.position.set(3, 2, -2);
    scene.add(ambient, key, rim);
    const material = (color, roughness = .72) => new THREE.MeshStandardMaterial({ color, roughness, metalness: .03 });
    const silver = material(0xb9bebc);
    const ivory = material(0xf2f2ed);
    const charcoal = material(0x343c39);
    const black = material(0x121a17, .26);
    const white = material(0xffffff, .22);
    const head = new THREE.Group();
    head.rotation.y = -.09;
    scene.add(head);
    function sphere(parent, mat, radius, position, scale = [1, 1, 1]) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 28), mat);
      mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh);
      return mesh;
    }
    sphere(head, silver, .71, [0, 0, 0], [1.02, .96, .82]);
    // The heart shaped facial disc gives a barn owl silhouette without a cartoon body.
    const disc = new THREE.Shape();
    disc.moveTo(0, -.57);
    disc.bezierCurveTo(-.23, -.45, -.59, -.15, -.58, .17);
    disc.bezierCurveTo(-.56, .47, -.22, .48, 0, .25);
    disc.bezierCurveTo(.22, .48, .56, .47, .58, .17);
    disc.bezierCurveTo(.59, -.15, .23, -.45, 0, -.57);
    const face = new THREE.Mesh(new THREE.ExtrudeGeometry(disc, { depth: .045, bevelEnabled: true, bevelThickness: .035, bevelSize: .04, bevelSegments: 5, steps: 1, curveSegments: 24 }), ivory);
    face.position.set(0, .03, .45); head.add(face);
    const eyes = [];
    for (const side of [-1, 1]) {
      sphere(head, material(0x9da5a0), .115, [side * .255, .105, .525], [1, 1.15, .24]);
      const eye = new THREE.Group(); eye.position.set(side * .255, .105, .551); head.add(eye);
      sphere(eye, black, .085, [0, 0, 0], [.93, 1.12, .36]);
      sphere(eye, white, .012, [-.019, .022, .031], [1, 1, .6]);
      eyes.push({ eye, x: side * .255 });
    }
    const beak = new THREE.Mesh(new THREE.ConeGeometry(.058, .19, 24), material(0x79837c));
    beak.rotation.x = Math.PI; beak.position.set(0, -.20, .57); head.add(beak);
    const cap = new THREE.Group(); cap.position.set(0, .66, -.02); cap.rotation.set(.04, -.18, -.05);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(.43, .48, .17, 40), charcoal); cap.add(crown);
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.34, .055, 1.14), charcoal);
    board.position.y = .12; cap.add(board);
    sphere(cap, silver, .047, [0, .169, 0], [1, .4, 1]);
    const cord = new THREE.CatmullRomCurve3([new THREE.Vector3(0,.165,0),new THREE.Vector3(.44,.164,.08),new THREE.Vector3(.62,.11,.13),new THREE.Vector3(.63,-.24,.14)]);
    cap.add(new THREE.Mesh(new THREE.TubeGeometry(cord, 28, .012, 7, false), material(0xaeb6b0)));
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(.03,.15,12), material(0xaeb6b0));
    tassel.position.set(.63,-.30,.14); cap.add(tassel); head.add(cap);
    let paused = preference.matches || control.getAttribute('aria-pressed') === 'true';
    let frame = 0, last = null, elapsed = 0, gazeX = 0, gazeY = 0, targetX = 0, targetY = 0;
    function render() { renderer.render(scene, camera); }
    function resize() {
      if (!container.clientWidth || !container.clientHeight) return;
      renderer.setSize(container.clientWidth, container.clientHeight, false);
      camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix(); render();
    }
    new ResizeObserver(resize).observe(container);
    window.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      const bounds = container.getBoundingClientRect();
      targetX = THREE.MathUtils.clamp((event.clientX - bounds.left - bounds.width / 2) / 300, -1, 1);
      targetY = THREE.MathUtils.clamp((bounds.top + bounds.height / 2 - event.clientY) / 260, -1, 1);
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; });
    function animate(time) {
      frame = 0; if (paused || document.hidden) return;
      const dt = last === null ? 0 : Math.min((time - last) / 1000, .05); last = time; elapsed += dt;
      const smoothing = 1 - Math.exp(-8 * dt);
      gazeX += (targetX - gazeX) * smoothing; gazeY += (targetY - gazeY) * smoothing;
      head.rotation.y = -.09 + gazeX * .065; head.rotation.x = -gazeY * .035;
      head.position.y = Math.sin(elapsed * .6) * .018;
      for (const { eye, x } of eyes) { eye.position.x = x + gazeX * .025; eye.position.y = .105 + gazeY * .016; }
      render(); frame = requestAnimationFrame(animate);
    }
    function update() {
      if (frame) cancelAnimationFrame(frame); frame = 0; last = null;
      if (!paused && !document.hidden) frame = requestAnimationFrame(animate);
    }
    window.addEventListener('owl-motion', (event) => { paused = event.detail.paused; update(); });
    window.addEventListener('owl-theme', (event) => { ambient.intensity = event.detail.theme === 'dark' ? 1.65 : 2.4; render(); });
    document.addEventListener('visibilitychange', update);
    renderer.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); paused = true; update(); renderer.domElement.hidden = true; container.parentElement.classList.remove('scene-ready'); });
    ambient.intensity = document.documentElement.dataset.theme === 'dark' ? 1.65 : 2.4;
    resize(); container.parentElement.classList.add('scene-ready'); update();
  } catch {
    container.replaceChildren(); // The static head remains visible; the form is independent of WebGL.
    if (!document.querySelector('#field-scene canvas')) {
      control.disabled = true;
      control.setAttribute('aria-label', 'Cenário estático: animação 3D indisponível');
      control.querySelector('span').textContent = 'Cenário estático';
    }
  }
})();
