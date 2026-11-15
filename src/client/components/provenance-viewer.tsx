"use client";
import { useMemo, useState } from "react";
import type { CourseProject } from "../project.ts";
import { originRows } from "../provenance.ts";
import { ContentPreview } from "./content.tsx";
import { Pagination } from "./pagination.tsx";
import { ScrollRegion } from "./scroll-region.tsx";

export function ProvenanceViewer({ project }: { project: CourseProject }) {
  const rows = useMemo(() => originRows(project), [project]);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [sourcePage, setSourcePage] = useState(0);
  const filtered = rows.filter((row) => !filter || row.path.includes(filter));
  const provenance = project.provenance;
  const selectedSource =
    provenance?.preview?.find((source) => source.sourceId === sourceId) ??
    provenance?.preview?.[0];
  return (
    <details className="form-details">
      <summary>Rastreabilidade dos campos</summary>
      <p className="field-help">
        {provenance?.provider && provenance.provider !== "unknown"
          ? `Interpretação: ${provenance.provider}${provenance.model ? ` · modelo ${provenance.model}` : ""} · prompt ${provenance.promptVersion} · schema ${provenance.schemaVersion}.`
          : "Origem inicial desconhecida: projeto manual ou antigo sem rastreabilidade."}{" "}
        Alterações da pessoa e aplicação de presets são registradas por ID de
        entidade e revisão. A importação original permanece preservada.
      </p>
      <label className="field">
        <span>Encontrar campo</span>
        <input
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value);
            setPage(0);
          }}
          placeholder="Ex.: metadata, title, questions"
        />
      </label>
      <ScrollRegion className="table-scroll" label="Origem dos campos">
        <table>
          <thead>
            <tr>
              <th scope="col">Campo atual</th>
              <th scope="col">Origem</th>
              <th scope="col">Referência</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(page * 10, page * 10 + 10).map((row) => (
              <tr key={row.path}>
                <td>{row.path}</td>
                <td>
                  {
                    {
                      extracted: "Documento extraído",
                      user: "Informado pela pessoa",
                      preset: "Preset aplicado",
                      unknown: "Desconhecida",
                    }[row.origin]
                  }
                </td>
                <td>
                  {row.presetId || row.sourceId || "—"}
                  {row.blockId ? <small>{row.blockId}</small> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
      <Pagination page={page} count={filtered.length} onChange={setPage} />
      {selectedSource && (
        <details className="form-details">
          <summary>Trechos dos documentos de origem</summary>
          <label className="field">
            <span>Documento</span>
            <select
              value={selectedSource.sourceId}
              onChange={(event) => {
                setSourceId(event.target.value);
                setSourcePage(0);
              }}
            >
              {provenance?.preview?.map((source) => (
                <option key={source.sourceId} value={source.sourceId}>
                  {source.name}
                </option>
              ))}
            </select>
          </label>
          <ContentPreview
            blocks={selectedSource.blocks.slice(
              sourcePage * 10,
              sourcePage * 10 + 10,
            )}
            assets={project.assets}
          />
          <Pagination
            page={sourcePage}
            count={selectedSource.blocks.length}
            onChange={setSourcePage}
          />
        </details>
      )}
    </details>
  );
}
