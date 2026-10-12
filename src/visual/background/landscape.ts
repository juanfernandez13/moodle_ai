import { createField, hill, meadowHeight } from "./field.ts";
import type { Point, ViewportBudget } from "./field.ts";
import type { BackgroundTheme } from "./runtime.ts";
import type { Color, Disposable, ThreeApi, Uniform } from "./three-types.ts";

const noise = `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
  }
`;

const palettes = {
  light: { sky: 0xb9dbd7, horizon: 0xdae5c6, sun: 0xffefc6, fog: 0xc4d8bf, far: 0x87aa99, middle: 0x629473, near: 0x477d4a, root: 0x294c2c, tip: 0xaabd69, leaf: 0x4d7948, density: .006, light: 2.1 },
  dark: { sky: 0x102c36, horizon: 0x577a78, sun: 0xacd2c6, fog: 0x436d66, far: 0x3e6b66, middle: 0x315e50, near: 0x264c3b, root: 0x173e2f, tip: 0x6d9365, leaf: 0x254d39, density: .0065, light: .85 },
};

/** All geometry is local and procedural; one resource scope owns the complete scene. */
export function createLandscape(T: ThreeApi, budget: ViewportBudget) {
  const resources = new Set<Disposable>();
  const own = <R extends Disposable>(resource: R): R => { resources.add(resource); return resource; };
  const dispose = () => { for (const resource of resources) resource.dispose(); resources.clear(); };
  try {
    const scene = new T.Scene();
    scene.fog = new T.FogExp2(palettes.light.fog, palettes.light.density);
    const camera = new T.PerspectiveCamera(budget.compact ? 52 : 44, budget.width / budget.height, .1, 420);
    camera.position.set(0, 5.2, 18);
    camera.lookAt(0, 4, -45);
    const elapsed = { value: 0 };
    const fogColor = { value: new T.Color() };
    const fogDensity = { value: .006 };
    const skyColor = { value: new T.Color() }, horizonColor = { value: new T.Color() }, sunColor = { value: new T.Color() };
    const night = { value: 0 };
    const sky = new T.Mesh(own(new T.SphereGeometry(360, 24, 16)), own(new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false,
      uniforms: { skyColor, horizonColor, sunColor, elapsed, night },
      vertexShader: `varying vec3 direction;
        void main() { direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `${noise}
        uniform vec3 skyColor, horizonColor, sunColor;
        uniform float elapsed, night;
        varying vec3 direction;
        void main() {
          vec3 d=normalize(direction);
          vec3 color=mix(horizonColor,skyColor,pow(clamp(d.y*1.8,0.,1.),.6));
          float glow=pow(max(0.,dot(d,normalize(vec3(-.7,.23,-1.)))),12.);
          color=mix(color,sunColor,glow*(.3-night*.14));
          vec2 p=d.xz/max(.18,d.y+.24)*vec2(1.9,1.15); p.x+=elapsed*.0015;
          float cloud=noise(p)*.6+noise(p*2.1+4.)*.28+noise(p*4.2)*.12;
          cloud=smoothstep(.48,.74,cloud)*smoothstep(.035,.2,d.y)*(1.-smoothstep(.65,.9,d.y));
          color=mix(color,sunColor,cloud*(.22-night*.12));
          gl_FragColor=vec4(color,1.);
          #include <colorspace_fragment>
        }`,
    })));
    scene.add(sky);

    const terrainColors: Uniform<Color>[] = [];
    function terrain(width: number, depth: number, z: number, height: (x: number, z: number) => number) {
      const geometry = own(new T.PlaneGeometry(width, depth, budget.compact ? 48 : 80, budget.compact ? 32 : 56));
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, 0, z);
      const p = geometry.getAttribute("position");
      for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i)));
      geometry.computeVertexNormals();
      const baseColor = { value: new T.Color() };
      terrainColors.push(baseColor);
      const material = own(new T.ShaderMaterial({
        uniforms: { baseColor, fogColor, fogDensity, sunColor, night },
        vertexShader: `varying vec3 surfaceNormal; varying vec2 ground; varying float distanceToCamera;
          void main() {
            surfaceNormal=normal; ground=position.xz;
            vec4 p=modelViewMatrix*vec4(position,1.); distanceToCamera=-p.z;
            gl_Position=projectionMatrix*p;
          }`,
        fragmentShader: `${noise}
          uniform vec3 baseColor, fogColor, sunColor; uniform float fogDensity, night;
          varying vec3 surfaceNormal; varying vec2 ground; varying float distanceToCamera;
          void main() {
            float diffuse=max(0.,dot(normalize(surfaceNormal),normalize(vec3(-.7,.8,.35))));
            float mottling=noise(ground*.16)*.56+noise(ground*.72)*.28+noise(ground*4.)*.16;
            vec3 color=baseColor*(.65+diffuse*.45)*(.83+mottling*.29);
            color=mix(color,color*vec3(1.12,1.05,.81),diffuse*(.24-night*.14));
            float haze=1.-exp(-pow(max(0.,distanceToCamera-12.)*fogDensity,1.35));
            color=mix(color,fogColor,haze*.9);
            gl_FragColor=vec4(color,1.);
            #include <colorspace_fragment>
          }`,
      }));
      scene.add(new T.Mesh(geometry, material));
    }
    terrain(420, 170, -183, (x, z) => -3 + hill(x, z, -90, -174, 78, 52, 30) + hill(x, z, 59, -190, 85, 59, 23));
    terrain(360, 146, -116, (x, z) => -2 + hill(x, z, -72, -107, 56, 39, 19) + hill(x, z, 65, -130, 59, 46, 17));
    terrain(340, 158, -44, meadowHeight);

    // Curved ribbons are instanced in irregular tufts; roots remain fixed under coherent wind.
    const grassGeometry = own(new T.InstancedBufferGeometry());
    const vertices: number[] = [], indices: number[] = [];
    for (let row = 0; row < 6; row++) {
      const t = row / 5, width = (1 - t) ** .75;
      vertices.push(-width, t, 0, width, t, 0);
      if (row < 5) { const j = row * 2; indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
    }
    grassGeometry.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
    grassGeometry.setIndex(indices);
    const field = createField(budget, camera.aspect, camera.fov);
    const grassOffsets = new T.InstancedBufferAttribute(field.offsets, 3);
    const grassTraits = new T.InstancedBufferAttribute(field.traits, 4);
    grassGeometry.setAttribute("offset", grassOffsets);
    grassGeometry.setAttribute("traits", grassTraits);
    grassGeometry.instanceCount = budget.bladeCount;
    const rootColor = { value: new T.Color() }, tipColor = { value: new T.Color() };
    const touch = { value: new T.Vector3(999, 0, 999) }, touchStrength = { value: 0 };
    const grass = new T.Mesh(grassGeometry, own(new T.ShaderMaterial({
      side: T.DoubleSide,
      uniforms: { elapsed, fogColor, fogDensity, rootColor, tipColor, touch, touchStrength, night },
      vertexShader: `attribute vec3 offset; attribute vec4 traits;
        uniform float elapsed, touchStrength; uniform vec3 touch;
        varying float tip, variation, distanceToCamera, sunlight;
        void main() {
          tip=position.y; variation=traits.w;
          vec2 facing=vec2(cos(traits.z),sin(traits.z));
          vec2 width=vec2(-facing.y,facing.x)*position.x*traits.y;
          float curve=(.18+traits.w*.48)*traits.x*tip*tip;
          float gust=sin(elapsed*.65+offset.x*.2+offset.z*.13);
          float ripple=sin(elapsed*1.3+offset.z*.5+traits.z)*.016;
          vec2 away=offset.xz-touch.xz;
          vec2 interaction=normalize(away+vec2(.001))*exp(-dot(away,away)/3.)*touchStrength*.22;
          vec3 p=offset+vec3(width.x,tip*traits.x,width.y);
          p.xz+=(facing*curve+vec2(.075,.025)*gust+vec2(ripple,0.)+interaction)*tip*tip;
          p.y-=tip*tip*traits.x*(.09+traits.w*.14);
          sunlight=.76+.25*abs(dot(facing,normalize(vec2(-.7,.35))));
          vec4 v=modelViewMatrix*vec4(p,1.); distanceToCamera=-v.z;
          gl_Position=projectionMatrix*v;
        }`,
      fragmentShader: `uniform vec3 rootColor, tipColor, fogColor; uniform float fogDensity, night;
        varying float tip, variation, distanceToCamera, sunlight;
        void main() {
          vec3 color=mix(rootColor,tipColor,pow(tip,.85))*sunlight*(.84+variation*.27);
          color=mix(color,color*vec3(1.13,1.05,.73),smoothstep(.86,1.,variation)*tip*(1.-night*.6));
          float haze=1.-exp(-pow(max(0.,distanceToCamera-12.)*fogDensity,1.35));
          gl_FragColor=vec4(mix(color,fogColor,haze*.9),1.);
          #include <colorspace_fragment>
        }`,
    })));
    grass.frustumCulled = false;
    scene.add(grass);

    const ambient = new T.HemisphereLight(0xe1ead5, 0x293d27, 1.9);
    const sunlight = new T.DirectionalLight(0xffedc8, 2.1);
    sunlight.position.set(-35, 48, 25);
    scene.add(ambient, sunlight);
    const leafMaterial = own(new T.MeshStandardMaterial({ color: 0x4d7948, roughness: 1 }));
    const barkMaterial = own(new T.MeshStandardMaterial({ color: 0x594e37, roughness: 1 }));
    const trunkGeometry = own(new T.CylinderGeometry(.07, .15, 3.7, 7));
    const branchGeometry = own(new T.CylinderGeometry(.025, .07, 1.6, 6));
    const crownGeometry = own(new T.SphereGeometry(1, 14, 10));
    const crown = crownGeometry.getAttribute("position");
    for (let i = 0; i < crown.count; i++) {
      const x = crown.getX(i), y = crown.getY(i), z = crown.getZ(i);
      const variation = 1 + Math.sin(x * 9 + y * 4) * Math.cos(z * 7 - y * 6) * .14;
      crown.setXYZ(i, x * variation, y * variation, z * variation);
    }
    crownGeometry.computeVertexNormals();
    const trees = [-.77, -.94, .91].map((edge, index) => {
      const tree = new T.Group();
      const trunk = new T.Mesh(trunkGeometry, barkMaterial);
      trunk.position.y = 1.85;
      trunk.rotation.z = index === 1 ? -.08 : .06;
      tree.add(trunk);
      for (let i = 0; i < 3; i++) {
        const branch = new T.Mesh(branchGeometry, barkMaterial);
        branch.position.set((i % 2 ? -1 : 1) * .32, 2.5 + i * .36, 0);
        branch.rotation.z = (i % 2 ? 1 : -1) * .63;
        tree.add(branch);
      }
      for (let i = 0; i < 6; i++) {
        const canopy = new T.Mesh(crownGeometry, leafMaterial);
        const angle = i * 2.4;
        canopy.position.set(Math.cos(angle) * .85, 3.45 + Math.sin(i * 1.6) * .58, Math.sin(angle) * .65);
        canopy.scale.set(1.1 + i % 3 * .13, 1.02 + i % 2 * .24, .95 + i % 3 * .14);
        tree.add(canopy);
      }
      const scale = index === 0 ? 1.2 : index === 1 ? .84 : .58;
      tree.scale.set(scale, scale, scale);
      scene.add(tree);
      return { tree, edge, z: index === 0 ? -30 : index === 1 ? -46 : -55 };
    });

    const particleGeometry = own(new T.BufferGeometry());
    const positions = new Float32Array(budget.particleCount * 3);
    const particlePosition = new T.Float32BufferAttribute(positions, 3);
    particleGeometry.setAttribute("position", particlePosition);
    const phases = new Float32Array(budget.particleCount);
    for (let i = 0; i < phases.length; i++) phases[i] = i * 2.39996;
    particleGeometry.setAttribute("phase", new T.Float32BufferAttribute(phases, 1));
    const pixelRatio = { value: budget.ratio };
    const particles = new T.Points(particleGeometry, own(new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      uniforms: { elapsed, night, pixelRatio },
      vertexShader: `attribute float phase; uniform float elapsed, pixelRatio; varying float pulse;
        void main() {
          vec3 p=position+vec3(sin(elapsed*.27+phase)*.23,cos(elapsed*.32+phase)*.2,sin(elapsed*.19+phase)*.16);
          vec4 v=modelViewMatrix*vec4(p,1.);
          pulse=.65+.35*sin(elapsed*.7+phase);
          gl_PointSize=clamp(240./max(1.,-v.z),4.,11.)*pixelRatio;
          gl_Position=projectionMatrix*v;
        }`,
      fragmentShader: `uniform float night; varying float pulse;
        void main() {
          float r=dot(gl_PointCoord-.5,gl_PointCoord-.5);
          float alpha=(exp(-r*170.)+exp(-r*25.)*.13)*pulse*(.08+night*.7);
          if(alpha<.002) discard;
          gl_FragColor=vec4(.88,1.,.56,alpha);
          #include <colorspace_fragment>
        }`,
    })));
    particles.frustumCulled = false;
    scene.add(particles);

    function resize(next: ViewportBudget) {
      camera.aspect = next.width / next.height;
      camera.updateProjectionMatrix();
      pixelRatio.value = next.ratio;
      const field = createField(next, camera.aspect, camera.fov);
      grassOffsets.array.set(field.offsets);
      grassTraits.array.set(field.traits);
      grassOffsets.needsUpdate = grassTraits.needsUpdate = true;
      const perspective = Math.tan(camera.fov * Math.PI / 360) * camera.aspect;
      for (const { tree, edge, z } of trees) {
        const x = edge * (18 - z) * perspective;
        tree.position.set(x, meadowHeight(x, z), z);
      }
      for (let i = 0; i < next.particleCount; i++) {
        const z = -5 - (i * 17 % 41), side = i % 2 ? -1 : 1;
        const x = side * (.72 + (i * 7 % 19) / 100) * (18 - z) * perspective;
        particlePosition.array.set([x, meadowHeight(x, z) + 1.1 + (i * 3 % 11) / 7, z], i * 3);
      }
      particlePosition.needsUpdate = true;
    }
    function setTheme(theme: BackgroundTheme) {
      const p = palettes[theme];
      skyColor.value.set(p.sky); horizonColor.value.set(p.horizon); sunColor.value.set(p.sun);
      fogColor.value.set(p.fog); fogDensity.value = p.density;
      scene.fog.color.set(p.fog); scene.fog.density = p.density;
      rootColor.value.set(p.root); tipColor.value.set(p.tip); leafMaterial.color.set(p.leaf);
      night.value = theme === "dark" ? 1 : 0;
      sunlight.intensity = p.light; ambient.intensity = theme === "dark" ? 1.35 : 1.9;
      for (const [index, color] of terrainColors.entries()) color.value.set([p.far, p.middle, p.near][index]!);
    }
    function animate(time: number, point: Point) {
      elapsed.value = time;
      const scale = budget.compact ? .42 : 1;
      camera.position.set(point.x * .9 * scale, 5.2 - point.y * .24, 18);
      camera.lookAt(-point.x * .22 * scale, 4 - point.y * .08, -45);
      const z = -5 - (1 - (point.y + 1) / 2) * 34;
      const x = point.x * (18 - z) * Math.tan(camera.fov * Math.PI / 360) * camera.aspect;
      touch.value.set(x, meadowHeight(x, z), z);
      touchStrength.value = Math.abs(point.x) > .55 ? 1 : 0;
    }
    resize(budget);
    return { scene, camera, resize, setTheme, animate, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}

export type Landscape = ReturnType<typeof createLandscape>;
