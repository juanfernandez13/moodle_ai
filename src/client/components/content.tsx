"use client";
import { useEffect, useState, useId } from "react";
import type { ContentBlock, InlineBlock } from "../../domain/course/index.ts";
import type { ProjectFile } from "../project.ts";
import { newId } from "../project.ts";
import { Pagination } from "./pagination.tsx";
import { richTableRowFocus } from "../navigation.ts";
import type { ReactNode } from "react";
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Image as ImageIcon,
  Table2,
} from "lucide-react";

export function AssetImage({
  asset,
  alt,
}: {
  asset?: ProjectFile | undefined;
  alt: string;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl("");
    if (
      !asset ||
      !["image/png", "image/jpeg", "image/gif", "image/webp"].includes(
        asset.mediaType,
      )
    )
      return;
    const next = URL.createObjectURL(
      new Blob([Uint8Array.from(asset.bytes)], { type: asset.mediaType }),
    );
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [asset]);
  return url ? (
    <img className="content-image" src={url} alt={alt} />
  ) : (
    <span className="notice">
      Imagem indisponível ou formato sem prévia segura.
    </span>
  );
}
export function ContentPreview({
  blocks,
  assets,
}: {
  blocks: ContentBlock[];
  assets: ProjectFile[];
}) {
  const inline = (block: InlineBlock) =>
    block.kind === "text" ? (
      <p key={block.id} className="preserve-text">
        {block.text}
      </p>
    ) : (
      <AssetImage
        key={block.id}
        asset={assets.find((entry) => entry.id === block.attachmentId)}
        alt={block.alt}
      />
    );
  return (
    <div className="content-preview">
      {blocks.map((block) =>
        block.kind === "table" ? (
          <TablePreview key={block.id} block={block} inline={inline} />
        ) : (
          inline(block)
        ),
      )}
    </div>
  );
}

function TablePreview({
  block,
  inline,
}: {
  block: Extract<ContentBlock, { kind: "table" }>;
  inline: (block: InlineBlock) => ReactNode;
}) {
  const [page, setPage] = useState(0);
  const activePage = Math.min(
    page,
    Math.max(0, Math.ceil(block.rows.length / 5) - 1),
  );
  return (
    <div>
      <div className="table-scroll">
        <table>
          <tbody>
            {block.rows
              .slice(activePage * 5, activePage * 5 + 5)
              .map((row, offset) => (
                <tr key={activePage * 5 + offset}>
                  {row.map((cell, index) => (
                    <td key={index}>{cell.blocks.map(inline)}</td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {block.rows.length > 5 && (
        <Pagination
          page={activePage}
          count={block.rows.length}
          size={5}
          onChange={setPage}
        />
      )}
    </div>
  );
}

export function RichEditor({
  label,
  blocks,
  fallback,
  assets,
  onChange,
  focusBlock,
  focusPath,
}: {
  label: string;
  blocks?: ContentBlock[] | undefined;
  fallback: string;
  assets: ProjectFile[];
  onChange: (blocks: ContentBlock[] | undefined) => void;
  focusBlock?: number | undefined;
  focusPath?: string | undefined;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    blocks?.[focusBlock ?? 0]?.id ?? null,
  );
  const [expanded, setExpanded] = useState(focusBlock !== undefined);
  const [tableRows, setTableRows] = useState<Record<string, number>>(() => {
    const selected = blocks?.[focusBlock ?? 0];
    return focusBlock !== undefined && selected?.kind === "table"
      ? { [selected.id]: richTableRowFocus(focusPath) ?? 0 }
      : {};
  });
  const tableRow = (block: Extract<ContentBlock, { kind: "table" }>) =>
    Math.min(tableRows[block.id] ?? 0, block.rows.length - 1);
  const bodyId = useId();
  const images = assets.filter((entry) =>
    ["image/png", "image/jpeg", "image/gif", "image/webp"].includes(
      entry.mediaType,
    ),
  );
  if (blocks === undefined || !expanded)
    return (
      <>
        <button
          type="button"
          className="text-button rich-enable"
          aria-expanded={false}
          aria-controls={bodyId}
          onClick={() => {
            setExpanded(true);
            if (blocks === undefined)
              onChange([{ id: newId("block"), kind: "text", text: fallback }]);
          }}
        >
          <ImageIcon size={16} />
          Organizar texto, imagens e tabelas
          {blocks
            ? ` (${blocks.length} ${blocks.length === 1 ? "bloco" : "blocos"})`
            : ""}
        </button>
        <div id={bodyId} hidden />
      </>
    );
  const change = (index: number, block: ContentBlock) =>
    onChange(
      blocks.map((entry, position) => (position === index ? block : entry)),
    );
  const move = (index: number, destination: number) => {
    const next = [...blocks];
    const block = next.splice(index, 1)[0]!;
    next.splice(destination, 0, block);
    onChange(next);
  };
  const selected = blocks.find((entry) => entry.id === selectedId) ?? blocks[0];
  const append = (block: ContentBlock) => {
    setSelectedId(block.id);
    onChange([...blocks, block]);
  };
  return (
    <fieldset className="rich-editor" id={bodyId}>
      <legend>{label}: blocos de conteúdo</legend>
      <button
        type="button"
        className="text-button"
        aria-expanded={true}
        aria-controls={bodyId}
        onClick={() => setExpanded(false)}
      >
        Recolher blocos
      </button>
      <p className="field-help">
        Estes blocos definem a apresentação. O texto simples fica preservado.
      </p>
      {blocks.length > 0 && (
        <label className="field">
          <span>Bloco em edição ({blocks.length})</span>
          <select
            value={selected?.id ?? ""}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {blocks.map((block, index) => (
              <option key={block.id} value={block.id}>
                {index + 1}.{" "}
                {block.kind === "text"
                  ? `Texto: ${block.text.slice(0, 40)}`
                  : block.kind === "image"
                    ? "Imagem"
                    : "Tabela"}
              </option>
            ))}
          </select>
        </label>
      )}
      {blocks.map((block, index) =>
        block.id === selected?.id ? (
          <div className="rich-block" key={block.id} id={`entity-${block.id}`}>
            <div className="block-heading">
              <strong>
                {index + 1}.{" "}
                {block.kind === "text"
                  ? "Texto"
                  : block.kind === "image"
                    ? "Imagem"
                    : "Tabela"}
              </strong>
              <span className="icon-actions">
                <button
                  type="button"
                  aria-label={`Subir bloco ${index + 1}`}
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  aria-label={`Descer bloco ${index + 1}`}
                  disabled={index === blocks.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  aria-label={`Remover bloco ${index + 1}`}
                  onClick={() =>
                    onChange(blocks.filter((_, position) => position !== index))
                  }
                >
                  <Trash2 size={16} />
                </button>
              </span>
            </div>
            {block.kind === "text" ? (
              <label className="field">
                <span>Texto do bloco {index + 1}</span>
                <textarea
                  data-field="text"
                  value={block.text}
                  onChange={(event) =>
                    change(index, { ...block, text: event.target.value })
                  }
                />
              </label>
            ) : block.kind === "image" ? (
              <>
                <label className="field">
                  <span>Imagem do projeto</span>
                  <select
                    data-field="attachmentId"
                    value={block.attachmentId}
                    onChange={(event) =>
                      change(index, {
                        ...block,
                        attachmentId: event.target.value,
                      })
                    }
                  >
                    {images.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Descrição da imagem</span>
                  <input
                    data-field="alt"
                    value={block.alt}
                    onChange={(event) =>
                      change(index, { ...block, alt: event.target.value })
                    }
                  />
                </label>
                <AssetImage
                  asset={assets.find(
                    (entry) => entry.id === block.attachmentId,
                  )}
                  alt={block.alt}
                />
              </>
            ) : (
              <>
                <label className="field">
                  <span>Linha em edição ({block.rows.length} linhas)</span>
                  <select
                    data-field="rows"
                    value={tableRow(block)}
                    onChange={(event) =>
                      setTableRows((previous) => ({
                        ...previous,
                        [block.id]: Number(event.target.value),
                      }))
                    }
                  >
                    {block.rows.map((_, rowIndex) => (
                      <option key={rowIndex} value={rowIndex}>
                        Linha {rowIndex + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="table-scroll">
                  <table>
                    <tbody>
                      {block.rows
                        .slice(tableRow(block), tableRow(block) + 1)
                        .map((row) => {
                          const rowIndex = tableRow(block);
                          return (
                            <tr key={rowIndex}>
                              {row.map((cell, column) => (
                                <td key={column}>
                                  {cell.blocks.map((item, itemIndex) => (
                                    <div key={item.id} id={`entity-${item.id}`}>
                                      {item.kind === "text" ? (
                                        <label className="field">
                                          <span>
                                            Linha {rowIndex + 1}, coluna{" "}
                                            {column + 1}
                                          </span>
                                          <textarea
                                            data-field="text"
                                            value={item.text}
                                            onChange={(event) => {
                                              const next =
                                                structuredClone(block);
                                              next.rows[rowIndex]![
                                                column
                                              ]!.blocks[itemIndex] = {
                                                ...item,
                                                text: event.target.value,
                                              };
                                              change(index, next);
                                            }}
                                          />
                                        </label>
                                      ) : (
                                        <>
                                          <label className="field">
                                            <span>Imagem da célula</span>
                                            <select
                                              data-field="attachmentId"
                                              value={item.attachmentId}
                                              onChange={(event) => {
                                                const next =
                                                  structuredClone(block);
                                                next.rows[rowIndex]![
                                                  column
                                                ]!.blocks[itemIndex] = {
                                                  ...item,
                                                  attachmentId:
                                                    event.target.value,
                                                };
                                                change(index, next);
                                              }}
                                            >
                                              {images.map((image) => (
                                                <option
                                                  key={image.id}
                                                  value={image.id}
                                                >
                                                  {image.name}
                                                </option>
                                              ))}
                                            </select>
                                          </label>
                                          <AssetImage
                                            asset={assets.find(
                                              (entry) =>
                                                entry.id === item.attachmentId,
                                            )}
                                            alt={item.alt}
                                          />
                                          <label className="field">
                                            <span>
                                              Descrição da imagem na célula
                                            </span>
                                            <input
                                              data-field="alt"
                                              value={item.alt}
                                              onChange={(event) => {
                                                const next =
                                                  structuredClone(block);
                                                next.rows[rowIndex]![
                                                  column
                                                ]!.blocks[itemIndex] = {
                                                  ...item,
                                                  alt: event.target.value,
                                                };
                                                change(index, next);
                                              }}
                                            />
                                          </label>
                                        </>
                                      )}
                                      <button
                                        className="text-button"
                                        type="button"
                                        onClick={() => {
                                          const next = structuredClone(block);
                                          next.rows[rowIndex]![
                                            column
                                          ]!.blocks.splice(itemIndex, 1);
                                          change(index, next);
                                        }}
                                      >
                                        Remover conteúdo da célula
                                      </button>
                                    </div>
                                  ))}
                                  {images.length > 0 && (
                                    <button
                                      type="button"
                                      className="text-button"
                                      onClick={() => {
                                        const next = structuredClone(block);
                                        next.rows[rowIndex]![
                                          column
                                        ]!.blocks.push({
                                          id: newId("block"),
                                          kind: "image",
                                          attachmentId: images[0]!.id,
                                          alt: "",
                                        });
                                        change(index, next);
                                      }}
                                    >
                                      Adicionar imagem à célula
                                    </button>
                                  )}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                <div className="button-row">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setTableRows((previous) => ({
                        ...previous,
                        [block.id]: block.rows.length,
                      }));
                      change(index, {
                        ...block,
                        rows: [
                          ...block.rows,
                          Array.from(
                            { length: block.rows[0]?.length ?? 2 },
                            () => ({
                              blocks: [
                                {
                                  id: newId("block"),
                                  kind: "text" as const,
                                  text: "",
                                },
                              ],
                            }),
                          ),
                        ],
                      });
                    }}
                  >
                    Adicionar linha
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      change(index, {
                        ...block,
                        rows: block.rows.map((row) => [
                          ...row,
                          {
                            blocks: [
                              { id: newId("block"), kind: "text", text: "" },
                            ],
                          },
                        ]),
                      })
                    }
                  >
                    Adicionar coluna
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null,
      )}
      <div className="button-row">
        <button
          type="button"
          className="secondary"
          onClick={() => append({ id: newId("block"), kind: "text", text: "" })}
        >
          <Plus size={16} />
          Texto
        </button>
        <button
          type="button"
          className="secondary"
          disabled={images.length === 0}
          onClick={() =>
            append({
              id: newId("block"),
              kind: "image",
              attachmentId: images[0]!.id,
              alt: "",
            })
          }
        >
          <ImageIcon size={16} />
          Imagem
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() =>
            append({
              id: newId("block"),
              kind: "table",
              rows: Array.from({ length: 2 }, () =>
                Array.from({ length: 2 }, () => ({
                  blocks: [{ id: newId("block"), kind: "text", text: "" }],
                })),
              ),
            })
          }
        >
          <Table2 size={16} />
          Tabela
        </button>
      </div>
      {images.length === 0 && (
        <p className="field-help">
          Adicione uma imagem em Arquivos do projeto para inseri-la aqui.
        </p>
      )}
    </fieldset>
  );
}
