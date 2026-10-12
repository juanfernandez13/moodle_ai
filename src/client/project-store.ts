import type { CourseProject } from "./project.ts";
import { projectIdentity, validateProject } from "./project.ts";

export class ProjectStore {
  private database: Promise<IDBDatabase>;
  constructor(factory: IDBFactory, name = "moodle-ai-projects") {
    this.database = new Promise((resolve, reject) => {
      const request = factory.open(name, 2);
      request.onupgradeneeded = () => {
        const workspaces = request.result.createObjectStore("workspaces", {
          keyPath: "projectId",
        });
        if (request.result.objectStoreNames.contains("projects")) {
          // Copy in the same upgrade transaction; retain the entire v1 store as a recovery copy.
          const cursorRequest = request
            .transaction!.objectStore("projects")
            .openCursor();
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (!cursor) return;
            const legacy = cursor.value as CourseProject;
            workspaces.put({ ...legacy, projectId: projectIdentity(legacy) });
            cursor.continue();
          };
        }
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = () =>
        reject(
          new Error("Não foi possível abrir o armazenamento deste navegador."),
        );
      request.onblocked = () =>
        reject(new Error("Feche a outra aba para atualizar o armazenamento."));
    });
  }
  async save(
    project: CourseProject,
    expectedRevision: number | null,
  ): Promise<void> {
    const snapshot = structuredClone(project);
    snapshot.projectId = projectIdentity(snapshot);
    validateProject(snapshot);
    const database = await this.database;
    return new Promise((resolve, reject) => {
      const transaction = database.transaction("workspaces", "readwrite");
      const store = transaction.objectStore("workspaces");
      let failure =
        "Falha ao salvar. A cópia anterior foi preservada; verifique o espaço do navegador.";
      const request = store.get(snapshot.projectId!);
      request.onsuccess = () => {
        const current = request.result as CourseProject | undefined;
        if (
          (expectedRevision === null && current !== undefined) ||
          (expectedRevision !== null &&
            (current === undefined ||
              current.draft.revision !== expectedRevision)) ||
          (current && snapshot.draft.revision < current.draft.revision)
        ) {
          failure =
            "Outra aba alterou este projeto. Reabra a versão salva ou exporte sua cópia antes de continuar.";
          transaction.abort();
          return;
        }
        store.put(snapshot);
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(new Error(failure));
      transaction.onerror = () => {
        /* onabort reports the retained previous version */
      };
    });
  }
  async load(id: string): Promise<CourseProject | null> {
    const database = await this.database;
    return new Promise((resolve, reject) => {
      const request = database
        .transaction("workspaces")
        .objectStore("workspaces")
        .get(id);
      request.onsuccess = () => {
        try {
          const value = request.result as CourseProject | undefined;
          if (value) validateProject(value);
          resolve(value ? structuredClone(value) : null);
        } catch {
          reject(
            new Error(
              "O projeto salvo contém dados inválidos. Importe uma cópia portátil.",
            ),
          );
        }
      };
      request.onerror = () =>
        reject(new Error("Não foi possível reabrir este projeto."));
    });
  }
  async list(): Promise<CourseProject[]> {
    const database = await this.database;
    return new Promise((resolve, reject) => {
      const request = database
        .transaction("workspaces")
        .objectStore("workspaces")
        .getAll();
      request.onsuccess = () => resolve(request.result as CourseProject[]);
      request.onerror = () =>
        reject(new Error("Não foi possível listar os projetos."));
    });
  }
  async close(): Promise<void> {
    (await this.database).close();
  }
}
