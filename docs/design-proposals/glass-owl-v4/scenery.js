(() => {
  'use strict';
  const T = window.THREE;
  const host = document.getElementById('field-scene');
  if (!host) return;

  try {
    const compact = matchMedia('(max-width: 760px)').matches;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, compact ? 1.25 : 1.5));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.NoToneMapping;
    host.append(renderer.domElement);

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(43, 1, .1, 430);
    camera.position.set(0, 6.8, 20);
    camera.lookAt(0, 8.4, -75);

    const elapsed = { value: 0 };
    const palettes = {
      light: {
        sky: 0xc6dfdf, horizon: 0xe8eee1, glow: 0xf6f7e9,
        far: 0xb0ccc0, middle: 0x88b8a5, near: 0x607a56,
        fog: 0xd4e3d7, density: .0055, grassBase: 0x3c593b, grassTip: 0x9db77a
      },
      dark: {
        sky: 0x122e3b, horizon: 0x628d91, glow: 0x9fbdba,
        far: 0x557d77, middle: 0x416e62, near: 0x335f54,
        fog: 0x547d7d, density: .005, grassBase: 0x274a3d, grassTip: 0x638975
      }
    };
    const skyUniforms = {
      skyColor: { value: new T.Color() },
      horizonColor: { value: new T.Color() },
      glowColor: { value: new T.Color() },
      glowStrength: { value: .18 },
      cloudStrength: { value: .3 },
      elapsed
    };
    const sky = new T.Mesh(
      new T.SphereGeometry(390, 32, 20),
      new T.ShaderMaterial({
        side: T.BackSide,
        depthWrite: false,
        uniforms: skyUniforms,
        vertexShader: `
          varying vec3 direction;
          void main() {
            direction = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
          }
        `,
        fragmentShader: `
          uniform vec3 skyColor;
          uniform vec3 horizonColor;
          uniform vec3 glowColor;
          uniform float glowStrength;
          uniform float cloudStrength;
          uniform float elapsed;
          varying vec3 direction;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) {
            vec2 cell = floor(p), f = fract(p);
            f = f * f * (3. - 2. * f);
            return mix(mix(hash(cell), hash(cell + vec2(1., 0.)), f.x),
              mix(hash(cell + vec2(0., 1.)), hash(cell + 1.), f.x), f.y);
          }
          float cloudNoise(vec2 p) {
            return noise(p) * .6 + noise(p * 2.1 + 4.) * .27 + noise(p * 4.2 + 9.) * .13;
          }
          void main() {
            vec3 d = normalize(direction);
            float elevation = pow(clamp(d.y * 1.8, 0., 1.), .62);
            vec3 color = mix(horizonColor, skyColor, elevation);
            float halo = pow(max(0., dot(d, normalize(vec3(-.65, .28, -1.)))), 9.);
            color = mix(color, glowColor, halo * glowStrength);
            vec2 cloudPlane = d.xz / max(d.y + .3, .3) * vec2(2.3, 1.2);
            cloudPlane.x += elapsed * .0015;
            float clouds = smoothstep(.44, .72, cloudNoise(cloudPlane));
            clouds *= smoothstep(.035, .16, d.y) * (1. - smoothstep(.65, .9, d.y));
            color = mix(color, glowColor, clouds * cloudStrength);
            gl_FragColor = vec4(color, 1.);
            #include <colorspace_fragment>
          }
        `
      })
    );
    scene.add(sky);

    const fogColor = { value: new T.Color() };
    const fogDensity = { value: .0065 };
    const terrain = [];
    const hill = (x, z, centerX, centerZ, width, depth, rise) =>
      rise * Math.exp(-((x - centerX) ** 2 / width ** 2 + (z - centerZ) ** 2 / depth ** 2));

    // Broad, continuous surfaces give the glass a calm landscape to refract.
    function addTerrain({ width, depth, centerZ, color, elevation }) {
      const geometry = new T.PlaneGeometry(width, depth, compact ? 64 : 100, compact ? 40 : 64);
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, 0, centerZ);
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        positions.setY(i, elevation(positions.getX(i), positions.getZ(i)));
      }
      geometry.computeVertexNormals();
      const material = new T.ShaderMaterial({
        uniforms: {
          baseColor: { value: new T.Color() },
          fogColor,
          fogDensity
        },
        vertexShader: `
          varying vec3 surfaceNormal;
          varying float distanceToCamera;
          varying float elevation;
          varying vec2 groundPosition;
          void main() {
            surfaceNormal = normal;
            elevation = position.y;
            groundPosition = position.xz;
            vec4 viewPosition = modelViewMatrix * vec4(position, 1.);
            distanceToCamera = -viewPosition.z;
            gl_Position = projectionMatrix * viewPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 baseColor;
          uniform vec3 fogColor;
          uniform float fogDensity;
          varying vec3 surfaceNormal;
          varying float distanceToCamera;
          varying float elevation;
          varying vec2 groundPosition;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) {
            vec2 cell = floor(p), f = fract(p);
            f = f * f * (3. - 2. * f);
            return mix(mix(hash(cell), hash(cell + vec2(1., 0.)), f.x),
              mix(hash(cell + vec2(0., 1.)), hash(cell + 1.), f.x), f.y);
          }
          void main() {
            vec3 n = normalize(surfaceNormal);
            float sunlight = dot(n, normalize(vec3(-.55, .8, .35)));
            float softLight = .6 + .46 * max(0., sunlight);
            vec3 color = baseColor * softLight;
            float meadow = noise(groundPosition * .09) * .58 + noise(groundPosition * .6) * .27;
            meadow += noise(groundPosition * 6.) * .15;
            color *= .83 + meadow * .31;
            color = mix(color, fogColor, smoothstep(0., 24., elevation) * .09);
            float haze = 1. - exp(-max(0., distanceToCamera - 18.) * fogDensity);
            color = mix(color, fogColor, haze * .84);
            gl_FragColor = vec4(color, 1.);
            #include <colorspace_fragment>
          }
        `
      });
      const mesh = new T.Mesh(geometry, material);
      scene.add(mesh);
      terrain.push({ material, color });
      return mesh;
    }

    addTerrain({
      width: 400, depth: 160, centerZ: -178, color: 'far',
      elevation: (x, z) => -3
        + hill(x, z, -99, -174, 94, 58, 27)
        + hill(x, z, 48, -182, 65, 51, 17)
    });
    addTerrain({
      width: 340, depth: 142, centerZ: -105, color: 'middle',
      elevation: (x, z) => -2
        + hill(x, z, -69, -99, 54, 38, 19)
        + hill(x, z, 67, -121, 62, 49, 13)
    });
    const foregroundHeight = (x, z) => -.7
      + hill(x, z, -47, -45, 46, 38, 8)
      + hill(x, z, -26, -38, 20, 38, 4.8)
      + hill(x, z, 59, -69, 54, 39, 10)
      + hill(x, z, 13, 43, 65, 27, 2)
      + Math.sin(x * .29 + z * .17) * Math.sin(z * .21) * .13;
    const foreground = addTerrain({
      width: 310, depth: 158, centerZ: -34, color: 'near',
      elevation: foregroundHeight
    });

    const touch = { value: new T.Vector3(999, 0, 999) };
    const touchStrength = { value: 0 };
    const grassBase = { value: new T.Color() };
    const grassTip = { value: new T.Color() };
    let seed = 18473;
    const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
    const grassGeometry = new T.InstancedBufferGeometry();
    const blade = [], indices = [];
    for (let i = 0; i < 6; i++) {
      const height = i / 5;
      const width = Math.pow(1 - height, .8);
      blade.push(-width, height, 0, width, height, 0);
      if (i < 5) {
        const j = i * 2;
        indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
      }
    }
    grassGeometry.setAttribute('position', new T.Float32BufferAttribute(blade, 3));
    grassGeometry.setIndex(indices);
    const count = compact ? 18000 : 34000;
    const offsets = new Float32Array(count * 3);
    const traits = new Float32Array(count * 4);
    let patchX = 0, patchZ = 0, patchRadius = 1;
    let centerX = 0, centerZ = 0, tuftHeight = .4;
    for (let i = 0; i < count; i++) {
      // Dense patches in the visible foreground, with looser cover toward the horizon.
      if (i % 160 === 0) {
        const near = i < count * .83;
        patchZ = near ? 8 - Math.pow(random(), 1.35) * 37 : -29 - random() * 49;
        const halfWidth = (20 - patchZ) * .63;
        patchX = (random() * 2 - 1) * halfWidth;
        patchRadius = near ? .55 + random() * .95 : 1.2 + random() * 1.4;
      }
      if (i % 8 === 0) {
        const tuftAngle = random() * Math.PI * 2;
        const tuftRadius = Math.sqrt(random()) * patchRadius;
        centerX = patchX + Math.cos(tuftAngle) * tuftRadius;
        centerZ = patchZ + Math.sin(tuftAngle) * tuftRadius;
        tuftHeight = .3 + random() ** 1.5 * .49;
      }
      const angle = random() * Math.PI * 2;
      const radius = random() * .24;
      const x = centerX + Math.cos(angle) * radius;
      const z = centerZ + Math.sin(angle) * radius;
      offsets.set([x, foregroundHeight(x, z) - .025, z], i * 3);
      traits.set([tuftHeight * (.7 + random() * .6), .019 + random() * .017, angle, random()], i * 4);
    }
    grassGeometry.setAttribute('offset', new T.InstancedBufferAttribute(offsets, 3));
    grassGeometry.setAttribute('traits', new T.InstancedBufferAttribute(traits, 4));
    grassGeometry.instanceCount = count;
    const grass = new T.Mesh(grassGeometry, new T.ShaderMaterial({
      side: T.DoubleSide,
      uniforms: { elapsed, touch, touchStrength, grassBase, grassTip, fogColor, fogDensity },
      vertexShader: `
        attribute vec3 offset;
        attribute vec4 traits;
        uniform float elapsed;
        uniform vec3 touch;
        uniform float touchStrength;
        varying float tip;
        varying float variation;
        varying float distanceToCamera;
        varying float sunlight;
        void main() {
          tip = position.y;
          variation = traits.w;
          float angle = traits.z;
          vec2 facing = vec2(cos(angle), sin(angle));
          vec2 bladeWidth = vec2(-facing.y, facing.x) * position.x * traits.y;
          float curve = (.25 + traits.w * .5) * traits.x * tip * tip;
          float gust = sin(elapsed * .53 + offset.x * .14 + offset.z * .12);
          float ripple = sin(elapsed * 1.1 + offset.z * .7 + angle) * .012;
          vec2 sway = vec2(.048, .022) * gust + vec2(ripple, ripple * .3);
          vec2 away = offset.xz - touch.xz;
          float bend = exp(-dot(away, away) / 2.5) * touchStrength * .15;
          vec2 displacement = normalize(away + vec2(.001)) * bend * tip * tip;
          vec3 p = offset + vec3(bladeWidth.x, tip * traits.x, bladeWidth.y);
          p.xz += facing * curve + sway * tip * tip + displacement;
          p.y -= tip * tip * (.12 + traits.w * .17) * traits.x;
          sunlight = .79 + .24 * abs(dot(facing, normalize(vec2(-.55, .35))));
          vec4 viewPosition = modelViewMatrix * vec4(p, 1.);
          distanceToCamera = -viewPosition.z;
          gl_Position = projectionMatrix * viewPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 grassBase;
        uniform vec3 grassTip;
        uniform vec3 fogColor;
        uniform float fogDensity;
        varying float tip;
        varying float variation;
        varying float distanceToCamera;
        varying float sunlight;
        void main() {
          vec3 color = mix(grassBase, grassTip, pow(tip, .8)) * sunlight;
          color *= .91 + variation * .16;
          color = mix(color, grassTip, smoothstep(.8, 1., variation) * .16);
          float haze = 1. - exp(-max(0., distanceToCamera - 18.) * fogDensity);
          color = mix(color, fogColor, haze * .84);
          gl_FragColor = vec4(color, 1.);
          #include <colorspace_fragment>
        }
      `
    }));
    grass.frustumCulled = false;
    scene.add(grass);

    const fireflyCount = compact ? 20 : 34;
    const FIREFLY_IDLE_SECONDS = 4;
    const FIREFLY_FOLLOW_SECONDS = 2;
    const fireflyFollowerCount = compact ? 3 : 6;
    const fireflyPositions = new Float32Array(fireflyCount * 3);
    const fireflyTraits = new Float32Array(fireflyCount * 4);
    const fireflyFollowers = new Float32Array(fireflyCount);
    const fireflyLanes = [];
    for (let i = 0; i < fireflyCount; i++) {
      fireflyLanes.push({
        side: i % 2 === 0 ? -1 : 1,
        edge: .78 + random() * .18,
        z: -7 - random() * 33,
        altitude: .9 + random() * 3.6
      });
      fireflyTraits.set([
        random() * Math.PI * 2,
        .65 + random() * .6,
        .12 + random() * .28,
        9 + random() * 6
      ], i * 4);
      fireflyFollowers[i] = i < fireflyFollowerCount ? 1 : 0;
    }
    const fireflyGeometry = new T.BufferGeometry();
    fireflyGeometry.setAttribute('position', new T.BufferAttribute(fireflyPositions, 3));
    fireflyGeometry.setAttribute('flight', new T.BufferAttribute(fireflyTraits, 4));
    fireflyGeometry.setAttribute('follower', new T.BufferAttribute(fireflyFollowers, 1));
    const fireflyStrength = { value: .7 };
    const fireflyAttraction = { value: 0 };
    const fireflyAttractor = { value: new T.Vector3() };
    const fireflies = new T.Points(fireflyGeometry, new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      uniforms: {
        elapsed,
        fireflyStrength,
        fireflyAttraction,
        fireflyAttractor,
        pixelRatio: { value: renderer.getPixelRatio() },
        haloColor: { value: new T.Color(0xd8eb8d) },
        coreColor: { value: new T.Color(0xfff2ba) }
      },
      vertexShader: `
        attribute vec4 flight;
        attribute float follower;
        uniform float elapsed;
        uniform float pixelRatio;
        uniform float fireflyAttraction;
        uniform vec3 fireflyAttractor;
        varying float glow;
        void main() {
          float phase = flight.x;
          float time = elapsed * flight.y;
          vec3 p = position;
          p.x += (sin(time * .24 + phase) + sin(time * .13 + phase * 2.) * .3) * flight.z;
          p.y += sin(time * .31 + phase * 1.7) * flight.z * .7;
          p.z += cos(time * .19 + phase) * flight.z * .45;
          float orbit = time * .3 + phase;
          float radius = .52 + flight.z * 1.3;
          vec3 nearPointer = fireflyAttractor + vec3(
            cos(orbit) * radius,
            sin(orbit * .83 + phase) * radius * .65,
            sin(orbit * .67) * .45
          );
          p = mix(p, nearPointer, fireflyAttraction * follower);
          glow = .58 + .42 * (.5 + .5 * sin(time * .54 + phase));
          vec4 viewPosition = modelViewMatrix * vec4(p, 1.);
          gl_PointSize = clamp(flight.w * 32. / max(1., -viewPosition.z), 5., 16.) * pixelRatio;
          gl_Position = projectionMatrix * viewPosition;
        }
      `,
      fragmentShader: `
        uniform float fireflyStrength;
        uniform vec3 haloColor;
        uniform vec3 coreColor;
        varying float glow;
        void main() {
          vec2 p = gl_PointCoord - .5;
          float radiusSquared = dot(p, p);
          float core = exp(-radiusSquared * 175.);
          float halo = exp(-radiusSquared * 23.) * .18;
          float edge = 1. - smoothstep(.16, .25, radiusSquared);
          float alpha = (core + halo) * edge * glow * fireflyStrength;
          if (alpha < .001) discard;
          vec3 color = mix(haloColor, coreColor, core);
          gl_FragColor = vec4(color, alpha);
          #include <colorspace_fragment>
        }
      `
    }));
    fireflies.frustumCulled = false;
    scene.add(fireflies);

    function positionFireflies() {
      const halfFov = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
      for (let i = 0; i < fireflyLanes.length; i++) {
        const lane = fireflyLanes[i];
        const halfWidth = (20 - lane.z) * halfFov * camera.aspect;
        const x = lane.side * lane.edge * halfWidth;
        fireflyPositions.set([x, foregroundHeight(x, lane.z) + lane.altitude, lane.z], i * 3);
      }
      fireflyGeometry.attributes.position.needsUpdate = true;
    }

    const motion = window.MoodleMotion;
    const cameraX = motion.track(0);
    const cameraY = motion.track(0);
    const grassTouch = motion.track(0);
    const raycaster = new T.Raycaster();
    const ndc = new T.Vector2();
    const fireflyFlightPlane = new T.Plane(new T.Vector3(0, 0, 1), 14);
    const fireflyTarget = new T.Vector3();
    const lastPointer = new T.Vector2();
    let pointerSeen = false;
    let pointerIdle = 0;
    let followingRemaining = 0;
    let fireflyMode = 'waiting';
    let attractorInitialized = false;
    let paused = document.documentElement.dataset.motion === 'paused';
    let contextLost = false;
    let frame = 0;
    let last = null;

    const isMovingAllowed = () => !paused && !reducedMotion.matches && !contextLost
      && !document.hidden && document.documentElement.dataset.scene === 'field';

    function render() {
      if (!contextLost) renderer.render(scene, camera);
    }

    function resetPointerIdle() {
      pointerSeen = false;
      pointerIdle = 0;
      followingRemaining = 0;
      fireflyMode = 'waiting';
    }

    function trackFireflyPointer(event) {
      const moved = !pointerSeen || Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y) > 1.5;
      if (moved) {
        if (fireflyMode === 'attracted') {
          fireflyMode = 'following';
          followingRemaining = FIREFLY_FOLLOW_SECONDS;
        }
        pointerIdle = 0;
        lastPointer.set(event.clientX, event.clientY);
      }
      pointerSeen = true;
      ndc.set(event.clientX / innerWidth * 2 - 1, 1 - event.clientY / innerHeight * 2);
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(fireflyFlightPlane, fireflyTarget)) {
        fireflyTarget.y = Math.max(fireflyTarget.y, foregroundHeight(fireflyTarget.x, fireflyTarget.z) + .85);
        if (!attractorInitialized) {
          fireflyAttractor.value.copy(fireflyTarget);
          attractorInitialized = true;
        }
      }
    }

    function updateFireflyAttraction(dt, wallDt) {
      if (pointerSeen) {
        pointerIdle += wallDt;
        if (pointerIdle >= FIREFLY_IDLE_SECONDS) fireflyMode = 'attracted';
        else if (fireflyMode === 'following') {
          followingRemaining = Math.max(0, followingRemaining - wallDt);
          if (followingRemaining === 0) fireflyMode = 'waiting';
        }
      }
      const attracted = pointerSeen && (fireflyMode === 'attracted' || fireflyMode === 'following');
      const destination = attracted ? 1 : 0;
      fireflyAttraction.value += (destination - fireflyAttraction.value) * (1 - Math.exp(-dt * 1.6));
      fireflyAttractor.value.lerp(fireflyTarget, 1 - Math.exp(-dt * 2.2));
    }

    function setTheme(theme) {
      const palette = palettes[theme === 'dark' ? 'dark' : 'light'];
      skyUniforms.skyColor.value.set(palette.sky);
      skyUniforms.horizonColor.value.set(palette.horizon);
      skyUniforms.glowColor.value.set(palette.glow);
      skyUniforms.glowStrength.value = theme === 'dark' ? .1 : .18;
      skyUniforms.cloudStrength.value = theme === 'dark' ? .12 : .3;
      fogColor.value.set(palette.fog);
      fogDensity.value = palette.density;
      grassBase.value.set(palette.grassBase);
      grassTip.value.set(palette.grassTip);
      fireflyStrength.value = theme === 'dark' ? .78 : .14;
      for (const layer of terrain) layer.material.uniforms.baseColor.value.set(palette[layer.color]);
      render();
    }

    function resize() {
      const width = Math.max(1, innerWidth);
      const height = Math.max(1, innerHeight);
      resetPointerIdle();
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      positionFireflies();
      render();
    }

    function animate(now) {
      frame = 0;
      if (!isMovingAllowed()) return;
      const wallDt = last === null ? 0 : Math.max(0, (now - last) / 1000);
      const dt = Math.min(wallDt, .05);
      last = now;
      elapsed.value += dt;
      touchStrength.value = grassTouch.step(dt);
      camera.position.x = cameraX.step(dt);
      camera.position.y = 6.8 - cameraY.step(dt);
      camera.lookAt(0, 8.4, -75);
      updateFireflyAttraction(dt, wallDt);
      render();
      frame = requestAnimationFrame(animate);
    }

    function update() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      last = null;
      resetPointerIdle();
      if (isMovingAllowed()) frame = requestAnimationFrame(animate);
    }

    function moveCamera(x, y) {
      if (!isMovingAllowed()) return;
      cameraX.set(x);
      cameraY.set(y);
      if (!frame) {
        last = null;
        frame = requestAnimationFrame(animate);
      }
    }

    window.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || !isMovingAllowed()) return;
      moveCamera((event.clientX / innerWidth - .5) * .28, (event.clientY / innerHeight - .5) * .08);
      trackFireflyPointer(event);
      if (event.target.closest('button,input,textarea,select,a,dialog,.main-slot')) {
        grassTouch.set(0);
        return;
      }
      ndc.set(event.clientX / innerWidth * 2 - 1, 1 - event.clientY / innerHeight * 2);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObject(foreground, false)[0];
      if (hit) {
        touch.value.copy(hit.point);
        grassTouch.set(1);
      } else grassTouch.set(0);
    }, { passive: true });
    window.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch' || !isMovingAllowed()) return;
      trackFireflyPointer(event);
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => {
      moveCamera(0, 0);
      grassTouch.set(0);
      resetPointerIdle();
    });
    window.addEventListener('resize', resize);
    window.addEventListener('owl-theme', event => setTheme(event.detail.theme));
    window.addEventListener('owl-motion', event => {
      paused = event.detail.paused;
      update();
    });
    window.addEventListener('owl-background', () => {
      resize();
      update();
    });
    reducedMotion.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      contextLost = true;
      update();
      renderer.domElement.hidden = true;
      host.dataset.state = 'fallback';
    });

    setTheme(document.documentElement.dataset.theme);
    resize();
    host.dataset.state = 'ready';
    update();
  } catch {
    host.replaceChildren();
    host.dataset.state = 'fallback';
  }
})();
