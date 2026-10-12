(() => {
  'use strict';
  const THREE = window.THREE;
  const container = document.getElementById('owl-scene');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  if (!container) return;
  try {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    container.append(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, .1, 30);
    camera.position.set(0, .15, 4.8);
    camera.lookAt(0, .1, 0);
    const ambient = new THREE.HemisphereLight(0xffffff, 0x6e7775, 2.4);
    const key = new THREE.DirectionalLight(0xffffff, 3.1);
    key.position.set(-4, 5, 6);
    const rim = new THREE.DirectionalLight(0xe7efff, 2);
    rim.position.set(3, 2, -2);
    scene.add(ambient, key, rim);
    const material = (color, roughness = .72) => new THREE.MeshStandardMaterial({ color, roughness, metalness: .03 });
    const brown = material(0xb89060, .86);
    const ivory = material(0xead4a9, .88);
    const charcoal = material(0x17191c, .76);
    const black = material(0x14221a, .24);
    const white = material(0xffffff, .22);
    const gold = material(0xf3bc35, .48);
    const eyeRim = material(0x55452f, .82);
    const irisRim = material(0x22503b, .48);
    const emerald = material(0x21a65d, .34);
    const head = new THREE.Group();
    head.rotation.y = -.07;
    head.rotation.z = -.055;
    scene.add(head);
    function sphere(parent, mat, radius, position, scale = [1, 1, 1]) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 28), mat);
      mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh);
      return mesh;
    }
    // The oval body, round white eyes and pointed ear tufts echo a storybook owl.
    sphere(head, brown, .70, [0, -.14, 0], [1, 1.16, .79]);
    sphere(head, ivory, 1, [0, -.40, .465], [.30, .38, .115]);
    // The local SVG keeps Moodle's original M and cap paths, colors and proportions.
    const chestMarkGeometry = new THREE.PlaneGeometry(.35, .35 * 238 / 345, 16, 12);
    const chestPositions = chestMarkGeometry.getAttribute('position');
    for (let vertex = 0; vertex < chestPositions.count; vertex++) {
      const x = chestPositions.getX(vertex), y = chestPositions.getY(vertex) - .03;
      // Attach the transparent logo to the chest without changing the source artwork.
      const surface = Math.sqrt(Math.max(0, 1 - (x / .30) ** 2 - (y / .38) ** 2));
      chestPositions.setZ(vertex, .465 + .115 * surface + .004);
    }
    chestMarkGeometry.computeVertexNormals();
    const chestMarkMaterial = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: .02, depthWrite: false, toneMapped: false });
    const chestMark = new THREE.Mesh(chestMarkGeometry, chestMarkMaterial);
    chestMark.position.y = -.43;
    chestMark.visible = false;
    head.add(chestMark);
    new THREE.TextureLoader().load('assets/moodle-mark.svg', texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      chestMarkMaterial.map = texture;
      chestMarkMaterial.needsUpdate = true;
      chestMark.visible = true;
      render();
    });
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(.13, .34, 4), brown);
      ear.position.set(side * .51, .55, -.015);
      ear.rotation.z = -side * .62;
      ear.rotation.y = Math.PI / 4;
      head.add(ear);
      for (let toe = 0; toe < 3; toe++) {
        sphere(head, ivory, 1, [side * .265 + (toe - 1) * .064, -.865, .24], [.043, .105, .071]);
      }
    }
    // Slim folded wings leave the pale chest and broad eyes unobstructed.
    const wings = [];
    for (const side of [-1, 1]) {
      const wing = new THREE.Group();
      wing.position.set(side * .59, -.19, .025);
      wing.rotation.z = side * .10;
      sphere(wing, material(0x9a744b, .9), 1, [side * .025, -.16, 0], [.145, .44, .15]);
      for (let i = 0; i < 3; i++) {
        const feather = sphere(wing, material([0xc4a072, 0xb28c5e, 0xa37c50][i], .9), 1,
          [side * (-.035 + i * .049), -.21 + i * .018, .105], [.052, .30 - i * .022, .054]);
        feather.rotation.z = -side * (.04 + i * .07);
      }
      head.add(wing); wings.push({ wing, side });
    }
    const eyes = [];
    for (const side of [-1, 1]) {
      const eye = new THREE.Group(); eye.position.set(side * .275, .145, .485); head.add(eye);
      sphere(eye, eyeRim, .272, [0, 0, 0], [1, 1, .32]);
      sphere(eye, white, .254, [0, 0, .035], [1, 1, .40]);
      const iris = new THREE.Group(); eye.add(iris);
      sphere(iris, irisRim, .151, [0, 0, .120], [1, 1, .32]);
      sphere(iris, emerald, .138, [0, 0, .137], [1, 1, .28]);
      sphere(iris, black, .076, [0, 0, .166], [1, 1, .24]);
      sphere(iris, white, .029, [-.025, .036, .188], [1, 1, .48]);
      sphere(iris, white, .010, [.025, -.025, .186], [1, 1, .4]);
      eyes.push({ eye, iris });
    }
    // A tapered curved beak has a rounded root and a gently hooked tip.
    const beakCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -.065, .646), new THREE.Vector3(0, -.105, .689),
      new THREE.Vector3(0, -.161, .713), new THREE.Vector3(0, -.211, .692)
    ]);
    const beakVertices = [], beakIndices = [], beakRings = 18, beakSides = 16;
    for (let ring = 0; ring <= beakRings; ring++) {
      const t = ring / beakRings, center = beakCurve.getPoint(t), tangent = beakCurve.getTangent(t);
      const normal = new THREE.Vector3(1, 0, 0), binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
      const radius = .05 * Math.pow(1 - t, .65) + .001;
      for (let side = 0; side < beakSides; side++) {
        const angle = side / beakSides * Math.PI * 2;
        const p = center.clone().addScaledVector(normal, Math.cos(angle) * radius).addScaledVector(binormal, Math.sin(angle) * radius * .65);
        beakVertices.push(p.x, p.y, p.z);
        if (ring < beakRings) { const a = ring * beakSides + side, b = ring * beakSides + (side + 1) % beakSides; beakIndices.push(a, b, a + beakSides, b, b + beakSides, a + beakSides); }
      }
    }
    const beakGeometry = new THREE.BufferGeometry();
    beakGeometry.setAttribute('position', new THREE.Float32BufferAttribute(beakVertices, 3));
    beakGeometry.setIndex(beakIndices); beakGeometry.computeVertexNormals();
    head.add(new THREE.Mesh(beakGeometry, material(0xd4ac67, .5)));
    const cap = new THREE.Group(); cap.position.set(0, .65, -.03); cap.rotation.set(.035, -.23, -.065);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(.43, .48, .17, 40), charcoal); cap.add(crown);
    const outline=new THREE.Shape(); const w=.62,h=.49,r=.065;
    outline.moveTo(-w+r,-h);outline.lineTo(w-r,-h);outline.quadraticCurveTo(w,-h,w,-h+r);outline.lineTo(w,h-r);outline.quadraticCurveTo(w,h,w-r,h);outline.lineTo(-w+r,h);outline.quadraticCurveTo(-w,h,-w,h-r);outline.lineTo(-w,-h+r);outline.quadraticCurveTo(-w,-h,-w+r,-h);
    const board = new THREE.Mesh(new THREE.ExtrudeGeometry(outline,{depth:.028,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:3,steps:1,curveSegments:12}),charcoal);
    board.rotation.x=-Math.PI/2;board.position.y = .12; cap.add(board);
    sphere(cap, gold, .047, [0, .169, 0], [1, .4, 1]);
    const cord = new THREE.CatmullRomCurve3([new THREE.Vector3(0,.165,0),new THREE.Vector3(-.38,.164,.14),new THREE.Vector3(-.49,.11,.24),new THREE.Vector3(-.49,-.24,.27)]);
    cap.add(new THREE.Mesh(new THREE.TubeGeometry(cord, 28, .014, 7, false), gold));
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(.031,.15,12), gold);
    tassel.position.set(-.49,-.30,.27); cap.add(tassel); head.add(cap);
    let paused = preference.matches || document.documentElement.dataset.motion === 'paused';
    let contextLost = false;
    const motion = window.MoodleMotion, lookX = motion.track(0), lookY = motion.track(0), wingResponse = motion.track(0);
    let frame = 0, last = null, elapsed = 0, gazeX = 0, gazeY = 0;
    function render() { if (!contextLost) renderer.render(scene, camera); }
    function resize() {
      if (!container.clientWidth || !container.clientHeight) return;
      renderer.setSize(container.clientWidth, container.clientHeight, false);
      camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix(); render();
    }
    new ResizeObserver(resize).observe(container);
    window.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      const bounds = container.getBoundingClientRect();
      lookX.set(THREE.MathUtils.clamp((event.clientX - bounds.left - bounds.width / 2) / 300, -1, 1));
      lookY.set(THREE.MathUtils.clamp((bounds.top + bounds.height / 2 - event.clientY) / 260, -1, 1));
      wingResponse.set(event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom ? 1 : 0);
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { lookX.set(0); lookY.set(0); wingResponse.set(0); });
    function animate(time) {
      frame = 0; if (paused || contextLost || document.hidden) return;
      const dt = last === null ? 0 : Math.min((time - last) / 1000, .05); last = time; elapsed += dt;
      gazeX = lookX.step(dt); gazeY = lookY.step(dt);
      const wingLift = wingResponse.step(dt);
      for (const { wing, side } of wings) wing.rotation.z = side * (.10 + wingLift * .15);
      head.rotation.y = -.07 + gazeX * .085; head.rotation.x = -gazeY * .045;
      head.rotation.z = -.055 + Math.sin(elapsed*.3)*.009;
      head.position.y = Math.sin(elapsed * .6) * .018;
      const blinkPhase=elapsed%6.8;const blink=blinkPhase>6.8-motion.duration?Math.sin((blinkPhase-(6.8-motion.duration))/motion.duration*Math.PI):0;
      for (const { eye, iris } of eyes) { iris.position.x = gazeX * .027; iris.position.y = gazeY * .018; eye.scale.y=1-blink*.94; }
      render(); frame = requestAnimationFrame(animate);
    }
    function update() {
      if (frame) cancelAnimationFrame(frame); frame = 0; last = null;
      if (!paused && !contextLost && !document.hidden) frame = requestAnimationFrame(animate);
    }
    window.addEventListener('owl-motion', (event) => { paused = preference.matches || Boolean(event.detail?.paused); update(); });
    preference.addEventListener('change', () => { paused = preference.matches || document.documentElement.dataset.motion === 'paused'; update(); });
    window.addEventListener('owl-theme', (event) => { ambient.intensity = event.detail.theme === 'dark' ? 1.65 : 2.4; render(); });
    document.addEventListener('visibilitychange', update);
    renderer.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); contextLost = true; update(); renderer.domElement.hidden = true; container.parentElement.classList.remove('scene-ready'); });
    ambient.intensity = document.documentElement.dataset.theme === 'dark' ? 1.65 : 2.4;
    resize(); container.parentElement.classList.add('scene-ready'); update();
  } catch {
    container.replaceChildren(); // The static head remains visible; the form is independent of WebGL.
    container.parentElement?.classList.remove('scene-ready');
  }
})();
