import type { ResourceScope } from "./resources.ts";
import type { Geometry, Material, OwlObject, ThreeApi } from "./three-types.ts";

/** Geometry and palette adapted from docs/design-proposals/glass-owl-v4/owl.js. */
export function createOwlModel(THREE: ThreeApi, scope: ResourceScope, textureReady: () => void) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 30);
  camera.position.set(0, 0.15, 4.8);
  camera.lookAt(0, 0.1, 0);
  const ambient = new THREE.HemisphereLight(0xffffff, 0x6e7775, 2.4);
  const key = new THREE.DirectionalLight(0xffffff, 3.1);
  key.position.set(-4, 5, 6);
  const rim = new THREE.DirectionalLight(0xe7efff, 2);
  rim.position.set(3, 2, -2);
  scene.add(ambient, key, rim);

  const material = (color: number, roughness = 0.72) => scope.own(new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.03 }));
  const brown = material(0xb89060, 0.86);
  const ivory = material(0xead4a9, 0.88);
  const charcoal = material(0x17191c, 0.76);
  const black = material(0x14221a, 0.24);
  const white = material(0xffffff, 0.22);
  const gold = material(0xf3bc35, 0.48);
  const eyeRim = material(0x55452f, 0.82);
  const irisRim = material(0x22503b, 0.48);
  const emerald = material(0x21a65d, 0.34);
  const wingBrown = material(0x9a744b, 0.9);
  const feathers = [0xc4a072, 0xb28c5e, 0xa37c50].map((color) => material(color, 0.9));
  const head = new THREE.Group();
  scene.add(head);
  const spheres = new Map<number, Geometry>();
  function sphere(parent: OwlObject, mat: Material, radius: number, position: [number, number, number], scale: [number, number, number] = [1, 1, 1]) {
    let geometry = spheres.get(radius);
    if (!geometry) {
      geometry = scope.own(new THREE.SphereGeometry(radius, 40, 28));
      spheres.set(radius, geometry);
    }
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }

  sphere(head, brown, 0.7, [0, -0.14, 0], [1, 1.16, 0.79]);
  sphere(head, ivory, 1, [0, -0.4, 0.465], [0.3, 0.38, 0.115]);
  const chestGeometry = scope.own(new THREE.PlaneGeometry(0.35, 0.35 * 238 / 345, 16, 12));
  const positions = chestGeometry.getAttribute("position");
  for (let vertex = 0; vertex < positions.count; vertex++) {
    const x = positions.getX(vertex);
    const y = positions.getY(vertex) - 0.03;
    const surface = Math.sqrt(Math.max(0, 1 - (x / 0.3) ** 2 - (y / 0.38) ** 2));
    positions.setZ(vertex, 0.465 + 0.115 * surface + 0.004);
  }
  chestGeometry.computeVertexNormals();
  const chestMaterial = scope.own(new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.02, depthWrite: false, toneMapped: false }));
  const chest = new THREE.Mesh(chestGeometry, chestMaterial);
  chest.position.y = -0.43;
  chest.visible = false;
  head.add(chest);
  const texture = new THREE.TextureLoader().load("/three-owl/moodle-mark.svg", (loaded) => {
    if (scope.disposed) return;
    loaded.colorSpace = THREE.SRGBColorSpace;
    chestMaterial.map = loaded;
    chestMaterial.needsUpdate = true;
    chest.visible = true;
    textureReady();
  });
  scope.own(texture);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(scope.own(new THREE.ConeGeometry(0.13, 0.34, 4)), brown);
    ear.position.set(side * 0.51, 0.55, -0.015);
    ear.rotation.z = -side * 0.62;
    ear.rotation.y = Math.PI / 4;
    head.add(ear);
    for (let toe = 0; toe < 3; toe++) {
      sphere(head, ivory, 1, [side * 0.265 + (toe - 1) * 0.064, -0.865, 0.24], [0.043, 0.105, 0.071]);
    }
  }
  const wings: { wing: OwlObject; side: number }[] = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.set(side * 0.59, -0.19, 0.025);
    sphere(wing, wingBrown, 1, [side * 0.025, -0.16, 0], [0.145, 0.44, 0.15]);
    for (let i = 0; i < feathers.length; i++) {
      const feather = sphere(wing, feathers[i]!, 1, [side * (-0.035 + i * 0.049), -0.21 + i * 0.018, 0.105], [0.052, 0.3 - i * 0.022, 0.054]);
      feather.rotation.z = -side * (0.04 + i * 0.07);
    }
    head.add(wing);
    wings.push({ wing, side });
  }

  const eyes: { eye: OwlObject; iris: OwlObject }[] = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * 0.275, 0.145, 0.485);
    head.add(eye);
    sphere(eye, eyeRim, 0.272, [0, 0, 0], [1, 1, 0.32]);
    sphere(eye, white, 0.254, [0, 0, 0.035], [1, 1, 0.4]);
    const iris = new THREE.Group();
    eye.add(iris);
    sphere(iris, irisRim, 0.151, [0, 0, 0.12], [1, 1, 0.32]);
    sphere(iris, emerald, 0.138, [0, 0, 0.137], [1, 1, 0.28]);
    sphere(iris, black, 0.076, [0, 0, 0.166], [1, 1, 0.24]);
    sphere(iris, white, 0.029, [-0.025, 0.036, 0.188], [1, 1, 0.48]);
    sphere(iris, white, 0.01, [0.025, -0.025, 0.186], [1, 1, 0.4]);
    eyes.push({ eye, iris });
  }

  const beakCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.065, 0.646), new THREE.Vector3(0, -0.105, 0.689),
    new THREE.Vector3(0, -0.161, 0.713), new THREE.Vector3(0, -0.211, 0.692),
  ]);
  const vertices: number[] = [];
  const indices: number[] = [];
  const rings = 18;
  const sides = 16;
  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings;
    const center = beakCurve.getPoint(t);
    const tangent = beakCurve.getTangent(t);
    const normal = new THREE.Vector3(1, 0, 0);
    const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
    const radius = 0.05 * Math.pow(1 - t, 0.65) + 0.001;
    for (let side = 0; side < sides; side++) {
      const angle = side / sides * Math.PI * 2;
      const p = center.clone().addScaledVector(normal, Math.cos(angle) * radius).addScaledVector(binormal, Math.sin(angle) * radius * 0.65);
      vertices.push(p.x, p.y, p.z);
      if (ring < rings) {
        const a = ring * sides + side;
        const b = ring * sides + (side + 1) % sides;
        indices.push(a, b, a + sides, b, b + sides, a + sides);
      }
    }
  }
  const beakGeometry = scope.own(new THREE.BufferGeometry());
  beakGeometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  beakGeometry.setIndex(indices);
  beakGeometry.computeVertexNormals();
  head.add(new THREE.Mesh(beakGeometry, material(0xd4ac67, 0.5)));

  const cap = new THREE.Group();
  cap.position.set(0, 0.65, -0.03);
  cap.rotation.set(0.035, -0.23, -0.065);
  cap.add(new THREE.Mesh(scope.own(new THREE.CylinderGeometry(0.43, 0.48, 0.17, 40)), charcoal));
  const outline = new THREE.Shape();
  const w = 0.62, h = 0.49, r = 0.065;
  outline.moveTo(-w + r, -h);
  outline.lineTo(w - r, -h);
  outline.quadraticCurveTo(w, -h, w, -h + r);
  outline.lineTo(w, h - r);
  outline.quadraticCurveTo(w, h, w - r, h);
  outline.lineTo(-w + r, h);
  outline.quadraticCurveTo(-w, h, -w, h - r);
  outline.lineTo(-w, -h + r);
  outline.quadraticCurveTo(-w, -h, -w + r, -h);
  const boardGeometry = scope.own(new THREE.ExtrudeGeometry(outline, { depth: 0.028, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3, steps: 1, curveSegments: 12 }));
  const board = new THREE.Mesh(boardGeometry, charcoal);
  board.rotation.x = -Math.PI / 2;
  board.position.y = 0.12;
  cap.add(board);
  sphere(cap, gold, 0.047, [0, 0.169, 0], [1, 0.4, 1]);
  const cord = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.165, 0), new THREE.Vector3(-0.38, 0.164, 0.14),
    new THREE.Vector3(-0.49, 0.11, 0.24), new THREE.Vector3(-0.49, -0.24, 0.27),
  ]);
  cap.add(new THREE.Mesh(scope.own(new THREE.TubeGeometry(cord, 28, 0.014, 7, false)), gold));
  const tassel = new THREE.Mesh(scope.own(new THREE.ConeGeometry(0.031, 0.15, 12)), gold);
  tassel.position.set(-0.49, -0.3, 0.27);
  cap.add(tassel);
  head.add(cap);

  let gazeX = 0, gazeY = 0, wingLift = 0;
  function resetPose() {
    gazeX = gazeY = wingLift = 0;
    head.rotation.set(0, -0.07, -0.055);
    head.position.y = 0;
    for (const { wing, side } of wings) wing.rotation.z = side * 0.1;
    for (const { eye, iris } of eyes) {
      iris.position.set(0, 0, 0);
      eye.scale.y = 1;
    }
  }
  resetPose();
  return {
    scene, camera, resetPose,
    setTheme(theme: "light" | "dark") { ambient.intensity = theme === "dark" ? 1.65 : 2.4; },
    animate(elapsed: number, dt: number, targetX: number, targetY: number, hovered: boolean) {
      const blend = 1 - Math.exp(-dt * 10);
      gazeX += (targetX - gazeX) * blend;
      gazeY += (targetY - gazeY) * blend;
      wingLift += ((hovered ? 1 : 0) - wingLift) * blend;
      for (const { wing, side } of wings) wing.rotation.z = side * (0.1 + wingLift * 0.15);
      head.rotation.y = -0.07 + gazeX * 0.085;
      head.rotation.x = -gazeY * 0.045;
      head.rotation.z = -0.055 + Math.sin(elapsed * 0.3) * 0.009;
      head.position.y = Math.sin(elapsed * 0.6) * 0.018;
      const phase = elapsed % 6.8;
      const blink = phase > 6.5 ? Math.sin((phase - 6.5) / 0.3 * Math.PI) : 0;
      for (const { eye, iris } of eyes) {
        iris.position.x = gazeX * 0.027;
        iris.position.y = gazeY * 0.018;
        eye.scale.y = 1 - blink * 0.94;
      }
    },
  };
}
