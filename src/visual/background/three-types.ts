/** Narrow surface of the existing, local Three.js r186 bundle used by the landscape. */
export interface Disposable { dispose(): void }
export interface Vector { x: number; y: number; z: number; set(x: number, y: number, z: number): void }
export interface Color { set(value: number): void }
export interface Object3D {
  position: Vector; rotation: Vector; scale: Vector;
  frustumCulled: boolean;
  add(...objects: Object3D[]): void;
}
export interface Attribute {
  array: Float32Array;
  count: number; needsUpdate: boolean;
  getX(index: number): number; getY(index: number): number; getZ(index: number): number;
  setY(index: number, value: number): void;
  setXYZ(index: number, x: number, y: number, z: number): void;
}
export interface Geometry extends Disposable {
  instanceCount: number;
  getAttribute(name: string): Attribute;
  setAttribute(name: string, attribute: Attribute): void;
  setIndex(indices: number[]): void;
  rotateX(angle: number): void;
  translate(x: number, y: number, z: number): void;
  computeVertexNormals(): void;
}
export interface Material extends Disposable { color: Color }
export interface Uniform<T> { value: T }
export interface ShaderMaterial extends Material { uniforms: Record<string, Uniform<unknown>> }
export interface Camera extends Object3D {
  aspect: number; fov: number;
  lookAt(x: number, y: number, z: number): void;
  updateProjectionMatrix(): void;
}
export interface Scene extends Object3D { fog: { color: Color; density: number } }
export interface Light extends Object3D { intensity: number }
export interface Renderer extends Disposable {
  domElement: HTMLCanvasElement;
  outputColorSpace: string;
  toneMapping: number;
  renderLists?: Disposable;
  setPixelRatio(ratio: number): void;
  setSize(width: number, height: number, updateStyle: boolean): void;
  render(scene: Scene, camera: Camera): void;
  forceContextLoss(): void;
}
export interface ThreeApi {
  SRGBColorSpace: string; NoToneMapping: number; BackSide: number; DoubleSide: number; AdditiveBlending: number;
  WebGLRenderer: new (options: { canvas: HTMLCanvasElement; alpha: boolean; antialias: boolean; powerPreference: string }) => Renderer;
  Scene: new () => Scene;
  Group: new () => Object3D;
  PerspectiveCamera: new (fov: number, aspect: number, near: number, far: number) => Camera;
  Color: new (value?: number) => Color;
  Vector3: new (x?: number, y?: number, z?: number) => Vector;
  FogExp2: new (color: number, density: number) => Scene["fog"];
  HemisphereLight: new (sky: number, ground: number, intensity: number) => Light;
  DirectionalLight: new (color: number, intensity: number) => Light;
  PlaneGeometry: new (width: number, depth: number, segmentsX: number, segmentsZ: number) => Geometry;
  SphereGeometry: new (radius: number, segments: number, rings: number) => Geometry;
  CylinderGeometry: new (top: number, bottom: number, height: number, segments: number) => Geometry;
  BufferGeometry: new () => Geometry;
  InstancedBufferGeometry: new () => Geometry;
  Float32BufferAttribute: new (values: number[] | Float32Array, size: number) => Attribute;
  InstancedBufferAttribute: new (values: Float32Array, size: number) => Attribute;
  ShaderMaterial: new (options: { uniforms: Record<string, Uniform<unknown>>; vertexShader: string; fragmentShader: string; side?: number; depthWrite?: boolean; transparent?: boolean; blending?: number }) => ShaderMaterial;
  MeshStandardMaterial: new (options: { color: number; roughness: number }) => Material;
  Mesh: new (geometry: Geometry, material: Material) => Object3D;
  Points: new (geometry: Geometry, material: Material) => Object3D;
}
