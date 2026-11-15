/** Tema claro ou escuro. Sem escolha guardada a tela segue o sistema; o botão do cabeçalho guarda só o que o contraria. */
export type Scheme = "light" | "dark";

export const THEME_KEY = "moodle-ai-theme";
export const SYSTEM_DARK = "(prefers-color-scheme: dark)";

export function resolveScheme(
  stored: string | null,
  systemDark: boolean,
): Scheme {
  if (stored === "light" || stored === "dark") return stored;
  return systemDark ? "dark" : "light";
}

/** O botão sempre leva ao oposto do que está na tela. Se o destino é o do sistema, a pessoa está desfazendo o ajuste:
    nada fica guardado e a tela volta a acompanhar o sistema. */
export function toggleScheme(
  current: Scheme,
  systemDark: boolean,
): { scheme: Scheme; store: Scheme | null } {
  const scheme: Scheme = current === "dark" ? "light" : "dark";
  return {
    scheme,
    store: scheme === resolveScheme(null, systemDark) ? null : scheme,
  };
}

/** Roda no <head>, antes da primeira pintura: sem ele, quem usa o escuro vê a tela clara piscar até o app carregar.
    Mesma regra de resolveScheme, escrita à mão porque não pode esperar nenhum outro script. */
export const THEME_BOOT =
  `try{var s=localStorage.getItem(${JSON.stringify(THEME_KEY)})}catch(e){}` +
  `var d=s==="dark"||(s!=="light"&&matchMedia(${JSON.stringify(SYSTEM_DARK)}).matches);` +
  `document.documentElement.classList.add(d?"theme-dark":"theme-light")`;
