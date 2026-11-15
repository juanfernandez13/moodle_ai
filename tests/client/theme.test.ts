import { test } from "node:test";
import assert from "node:assert/strict";
import {
  THEME_BOOT,
  resolveScheme,
  toggleScheme,
} from "../../src/client/theme.ts";

test("sem escolha guardada a tela segue o sistema; com escolha, ela vence", () => {
  assert.equal(resolveScheme(null, false), "light");
  assert.equal(resolveScheme(null, true), "dark");
  assert.equal(resolveScheme("light", true), "light");
  assert.equal(resolveScheme("dark", false), "dark");
  assert.equal(resolveScheme("qualquer coisa", true), "dark");
});

test("o botão troca o que está na tela e só guarda a escolha que contraria o sistema", () => {
  // Sistema claro: escurecer contraria o sistema, então fica guardado.
  assert.deepEqual(toggleScheme("light", false), {
    scheme: "dark",
    store: "dark",
  });
  // O sistema escureceu depois: a escolha guardada continua valendo.
  assert.equal(resolveScheme("dark", true), "dark");
  // Sistema voltou ao claro e a pessoa desfaz: igual ao sistema, nada fica guardado.
  assert.deepEqual(toggleScheme("dark", false), {
    scheme: "light",
    store: null,
  });
  // Sistema escuro: clarear contraria o sistema; escurecer de novo volta a seguir o sistema.
  assert.deepEqual(toggleScheme("dark", true), {
    scheme: "light",
    store: "light",
  });
  assert.deepEqual(toggleScheme("light", true), {
    scheme: "dark",
    store: null,
  });
});

test("o script da primeira pintura marca a página antes de o app carregar, mesmo sem armazenamento", () => {
  const boot = (stored: string | null | Error, systemDark: boolean) => {
    const classes: string[] = [];
    new Function("localStorage", "matchMedia", "document", THEME_BOOT)(
      {
        getItem() {
          if (stored instanceof Error) throw stored;
          return stored;
        },
      },
      () => ({ matches: systemDark }),
      {
        documentElement: {
          classList: { add: (name: string) => classes.push(name) },
        },
      },
    );
    return classes;
  };
  assert.deepEqual(boot(null, true), ["theme-dark"]);
  assert.deepEqual(boot(null, false), ["theme-light"]);
  assert.deepEqual(boot("light", true), ["theme-light"]);
  assert.deepEqual(boot("dark", false), ["theme-dark"]);
  assert.deepEqual(boot(new Error("bloqueado"), true), ["theme-dark"]);
});
