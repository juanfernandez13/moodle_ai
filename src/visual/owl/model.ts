import type { ResourceScope } from "./resources.ts";
import type { Geometry, Material, OwlObject, ThreeApi } from "./three-types.ts";

/** A small clay-like scholar owl, with shallow face discs and a calm gaze. */
export function createOwlModel(THREE: ThreeApi, scope: ResourceScope, textureReady: () => void) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 30);
  camera.position.set(0, 0.15, 4.8);
  camera.lookAt(0, 0.1, 0);
  const ambient = new THREE.HemisphereLight(0xfff8ed, 0x776e61, 2.1);
  const key = new THREE.DirectionalLight(0xfffaf1, 2.5);
  key.position.set(-4, 5, 6);
  const rim = new THREE.DirectionalLight(0xe7efff, 1.4);
  rim.position.set(3, 2, -2);
  scene.add(ambient, key, rim);

  const material = (color: number, roughness = 0.9) => scope.own(new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 }));
  const brown = material(0xb68c62);
  const ivory = material(0xf1e2c3, 0.96);
  const charcoal = material(0x292b2a);
  const black = material(0x302c25, 0.8);
  const white = material(0xfcf4de, 0.88);
  const gold = material(0xe0ac49, 0.81);
  const irisRim = material(0x586c47, 0.86);
  const moss = material(0x819264, 0.8);
  const wingBrown = material(0xa27b54, 0.96);
  const feathers = [0xb58a5e, 0xaa8057].map((color) => material(color, 0.96));
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

  sphere(head, brown, 0.72, [0, -0.13, 0], [1, 1.1, 0.79]);
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
    const ear = sphere(head, brown, 0.13, [side * 0.49, 0.5, -0.015], [0.9, 1.35, 0.65]);
    ear.rotation.z = -side * 0.5;
    for (let toe = 0; toe < 3; toe++) {
      sphere(head, ivory, 1, [side * 0.265 + (toe - 1) * 0.064, -0.865, 0.24], [0.043, 0.08, 0.071]);
    }
  }
  const wings: { wing: OwlObject; side: number }[] = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.set(side * 0.59, -0.19, 0.025);
    sphere(wing, wingBrown, 1, [side * 0.025, -0.16, 0], [0.155, 0.39, 0.135]);
    for (let i = 0; i < feathers.length; i++) {
      const feather = sphere(wing, feathers[i]!, 1, [side * (-0.026 + i * 0.068), -0.22 + i * 0.025, 0.086], [0.062, 0.26 - i * 0.025, 0.05]);
      feather.rotation.z = -side * (0.06 + i * 0.07);
    }
    head.add(wing);
    wings.push({ wing, side });
  }

  const eyes: { eye: OwlObject; iris: OwlObject }[] = [];
  for (const side of [-1, 1]) {
    // The cream discs belong to the face; blinking only closes the small eyes.
    sphere(head, ivory, 0.27, [side * 0.248, 0.17, 0.46], [1.07, 1.02, 0.24]);
    const eye = new THREE.Group();
    eye.position.set(side * 0.245, 0.18, 0.523);
    head.add(eye);
    sphere(eye, white, 0.158, [0, 0, 0], [1, 0.96, 0.14]);
    const iris = new THREE.Group();
    eye.add(iris);
    sphere(iris, irisRim, 0.111, [0, 0, 0.023], [1, 1, 0.16]);
    sphere(iris, moss, 0.097, [0, 0, 0.036], [1, 1, 0.15]);
    sphere(iris, black, 0.06, [0, 0, 0.05], [1, 1, 0.15]);
    sphere(iris, white, 0.014, [-0.017, 0.023, 0.062], [1, 1, 0.25]);
    eyes.push({ eye, iris });
  }

  const beak = sphere(head, gold, 1, [0, -0.055, 0.557], [0.078, 0.093, 0.072]);
  beak.rotation.x = -0.18;

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
    head.rotation.set(0, -0.07, -0.025);
    head.position.y = 0;
    for (const { wing, side } of wings) wing.rotation.z = side * 0.08;
    for (const { eye, iris } of eyes) {
      iris.position.set(0, 0, 0);
      eye.scale.y = 1;
    }
  }
  resetPose();
  return {
    scene, camera, resetPose,
    setTheme(theme: "light" | "dark") { ambient.intensity = theme === "dark" ? 1.7 : 2.1; },
    animate(elapsed: number, dt: number, targetX: number, targetY: number, hovered: boolean) {
      const blend = 1 - Math.exp(-dt * 6);
      gazeX += (targetX - gazeX) * blend;
      gazeY += (targetY - gazeY) * blend;
      wingLift += ((hovered ? 1 : 0) - wingLift) * blend;
      for (const { wing, side } of wings) wing.rotation.z = side * (0.08 + wingLift * 0.07);
      head.rotation.y = -0.07 + gazeX * 0.045;
      head.rotation.x = -gazeY * 0.025;
      head.rotation.z = -0.025 + Math.sin(elapsed * 0.3) * 0.005;
      head.position.y = Math.sin(elapsed * 0.6) * 0.01;
      const phase = elapsed % 7.6;
      const blink = phase > 7.3 ? Math.sin((phase - 7.3) / 0.3 * Math.PI) : 0;
      for (const { eye, iris } of eyes) {
        iris.position.x = gazeX * 0.013;
        iris.position.y = gazeY * 0.009;
        eye.scale.y = 1 - blink * 0.94;
      }
    },
  };
}
