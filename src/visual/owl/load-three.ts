import type { ThreeApi } from "./three-types.ts";

let loading: Promise<ThreeApi> | undefined;

/** Load the already approved local r186 bundle once, shared across React mounts. */
export function loadThree(): Promise<ThreeApi> {
  const host = window as Window & { THREE?: ThreeApi };
  if (host.THREE?.REVISION === "186") return Promise.resolve(host.THREE);
  if (loading) return loading;
  loading = new Promise<ThreeApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/three-owl/three.browser.js";
    script.async = true;
    script.dataset.owlLibrary = "r186";
    script.onload = () => {
      script.onload = null;
      script.onerror = null;
      if (host.THREE?.REVISION === "186") resolve(host.THREE);
      else {
        script.remove();
        loading = undefined;
        reject(new Error("Biblioteca local da mascote indisponível."));
      }
    };
    script.onerror = () => {
      script.remove();
      loading = undefined;
      reject(new Error("Não foi possível carregar a mascote local."));
    };
    document.head.append(script);
  });
  return loading;
}
