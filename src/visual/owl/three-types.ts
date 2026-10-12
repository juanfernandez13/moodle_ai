/** The small r186 surface used by the procedural mascot; no application dependency. */
export interface Vector {
  x: number;
  y: number;
  z: number;
  set(x: number, y: number, z: number): void;
  clone(): Vector;
  addScaledVector(vector: Vector, scalar: number): Vector;
  crossVectors(a: Vector, b: Vector): Vector;
  normalize(): Vector;
}

export interface Disposable {
  dispose(): void;
}

export interface OwlObject {
  position: Vector;
  rotation: Vector;
  scale: Vector;
  visible: boolean;
  add(...objects: OwlObject[]): void;
}

interface BufferAttribute {
  count: number;
  getX(index: number): number;
  getY(index: number): number;
  setZ(index: number, value: number): void;
}

export interface Geometry extends Disposable {
  getAttribute(name: string): BufferAttribute;
  setAttribute(name: string, attribute: BufferAttribute): void;
  setIndex(indices: number[]): void;
  computeVertexNormals(): void;
}

export interface Texture extends Disposable {
  colorSpace: string;
}

export interface Material extends Disposable {
  map?: Texture;
  needsUpdate: boolean;
}

export interface Camera extends OwlObject {
  aspect: number;
  lookAt(x: number, y: number, z: number): void;
  updateProjectionMatrix(): void;
}

interface Light extends OwlObject {
  intensity: number;
}

interface Curve {
  getPoint(t: number): Vector;
  getTangent(t: number): Vector;
}

interface Shape {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(x: number, y: number, endX: number, endY: number): void;
}

export interface Renderer extends Disposable {
  domElement: HTMLCanvasElement;
  outputColorSpace: string;
  toneMapping: number;
  toneMappingExposure: number;
  renderLists?: Disposable;
  setPixelRatio(ratio: number): void;
  setSize(width: number, height: number, updateStyle: boolean): void;
  render(scene: OwlObject, camera: Camera): void;
  forceContextLoss(): void;
}

export interface ThreeApi {
  REVISION: string;
  SRGBColorSpace: string;
  ACESFilmicToneMapping: number;
  WebGLRenderer: new (options: { alpha: boolean; antialias: boolean }) => Renderer;
  Scene: new () => OwlObject;
  Group: new () => OwlObject;
  PerspectiveCamera: new (fov: number, aspect: number, near: number, far: number) => Camera;
  HemisphereLight: new (skyColor: number, groundColor: number, intensity: number) => Light;
  DirectionalLight: new (color: number, intensity: number) => Light;
  MeshStandardMaterial: new (options: { color: number; roughness: number; metalness: number }) => Material;
  MeshBasicMaterial: new (options: { transparent: boolean; alphaTest: number; depthWrite: boolean; toneMapped: boolean }) => Material;
  Mesh: new (geometry: Geometry, material: Material) => OwlObject;
  SphereGeometry: new (radius: number, segments: number, rings: number) => Geometry;
  PlaneGeometry: new (width: number, height: number, segmentsX: number, segmentsY: number) => Geometry;
  ConeGeometry: new (radius: number, height: number, segments: number) => Geometry;
  CylinderGeometry: new (top: number, bottom: number, height: number, segments: number) => Geometry;
  BufferGeometry: new () => Geometry;
  Float32BufferAttribute: new (vertices: number[], size: number) => BufferAttribute;
  Vector3: new (x?: number, y?: number, z?: number) => Vector;
  CatmullRomCurve3: new (points: Vector[]) => Curve;
  Shape: new () => Shape;
  ExtrudeGeometry: new (shape: Shape, options: { depth: number; bevelEnabled: boolean; bevelSize: number; bevelThickness: number; bevelSegments: number; steps: number; curveSegments: number }) => Geometry;
  TubeGeometry: new (curve: Curve, segments: number, radius: number, radialSegments: number, closed: boolean) => Geometry;
  TextureLoader: new () => {
    load(url: string, loaded: (texture: Texture) => void, progress?: undefined, failed?: () => void): Texture;
  };
}
