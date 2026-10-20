"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent, ReactNode } from "react";
import { CloudUpload, FileText, Plus, RefreshCw, Upload, X } from "lucide-react";
import {
  UPLOAD_LIMITS,
  formatMegabytes,
} from "../../../../shared/upload-limits.ts";
import { formatBytes } from "../../../download.ts";
import { Breakable } from "./breakable.tsx";

export const ACCEPT = ".docx,.pdf,.txt";
const EXTENSIONS = ["docx", "pdf", "txt"];
const MAX_FILE = formatMegabytes(UPLOAD_LIMITS.maxFileBytes);
export const LIMITS_TEXT = `Até ${UPLOAD_LIMITS.maxFiles} arquivos · ${MAX_FILE} cada`;
const tooBigNote = ` · maior que ${MAX_FILE}`;

export const plural = (count: number, one: string, many: string) =>
  count === 1 ? one : many;
function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}
export const isSupported = (file: File) =>
  EXTENSIONS.includes(extensionOf(file.name));
export const sameFile = (a: File, b: File) =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
const isTooBig = (file: File) => file.size > UPLOAD_LIMITS.maxFileBytes;

/* --- Arrastar e soltar --- */
const carriesFiles = (event: ReactDragEvent<HTMLElement>) =>
  Array.from(event.dataTransfer.types).includes("Files");

function useFileDrop(onFiles: (files: File[]) => void) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  useEffect(() => {
    const reset = () => {
      depth.current = 0;
      setDragging(false);
    };
    window.addEventListener("dragend", reset);
    window.addEventListener("drop", reset);
    return () => {
      window.removeEventListener("dragend", reset);
      window.removeEventListener("drop", reset);
    };
  }, []);
  return {
    dragging,
    dropProps: {
      onDragEnter(event: ReactDragEvent<HTMLElement>) {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        depth.current += 1;
        setDragging(true);
      },
      onDragOver(event: ReactDragEvent<HTMLElement>) {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      },
      onDragLeave(event: ReactDragEvent<HTMLElement>) {
        if (!carriesFiles(event)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      },
      onDrop(event: ReactDragEvent<HTMLElement>) {
        if (!carriesFiles(event)) return;
        event.preventDefault();
        depth.current = 0;
        setDragging(false);
        onFiles(Array.from(event.dataTransfer.files));
      },
    },
  };
}

/* Arrastando um arquivo por cima da tela: as caixas ficam à mostra. Fora delas o cursor
   mostra que ali não se solta e um aviso diz onde soltar. Sem isso o navegador abriria o
   arquivo e a tela (com tudo o que foi escolhido) seria perdida. As caixas tratam o
   próprio arrasto antes (o React corre antes desta escuta). */
export function useFileDragState() {
  const [armed, setArmed] = useState(false);
  const [stray, setStray] = useState(false);
  useEffect(() => {
    let depth = 0;
    let outside = false;
    const hasFiles = (event: DragEvent) =>
      event.dataTransfer?.types.includes("Files") === true;
    const setOutside = (value: boolean) => {
      if (outside === value) return;
      outside = value;
      setStray(value);
    };
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth += 1;
      setArmed(true);
    };
    const leave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth > 0) return;
      setArmed(false);
      setOutside(false);
    };
    const over = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      if (event.defaultPrevented) {
        setOutside(false);
        return;
      }
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
      setOutside(true);
    };
    const drop = (event: DragEvent) => {
      if (hasFiles(event) && !event.defaultPrevented) event.preventDefault();
      depth = 0;
      setArmed(false);
      setOutside(false);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    window.addEventListener("dragend", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
      window.removeEventListener("dragend", drop);
    };
  }, []);
  return { armed, stray };
}

/* --- Matriz: um arquivo só, sem caixa de arrastar. Uma linha: ícone, nome e um botão --- */
export function MatrixRow({
  file,
  onAdd,
  onRemove,
}: {
  file: File | undefined;
  onAdd: (files: File[]) => string;
  onRemove: () => void;
}) {
  const titleId = useId();
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const chooseRef = useRef<HTMLButtonElement>(null);
  const [note, setNote] = useState("");
  const big = file !== undefined && isTooBig(file);
  return (
    <div
      className="entry-matrix"
      id="upload-group-planning"
      role="group"
      aria-labelledby={titleId}
      data-filled={file !== undefined}
    >
      <span className="entry-icon" aria-hidden="true">
        <FileText size={20} />
      </span>
      <div className="entry-matrix-text">
        <h2 id={titleId} className="entry-card-title">
          Matriz
        </h2>
        {file && (
          <p className="entry-matrix-file" data-big={big || undefined}>
            <span className="entry-file-name">
              <Breakable text={file.name} />
            </span>
            <span className="entry-file-size">
              {" · "}
              {formatBytes(file.size)}
              {big && tooBigNote}
            </span>
          </p>
        )}
      </div>
      <input
        id="upload-planning"
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept={ACCEPT}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          setNote(onAdd(Array.from(event.target.files ?? [])));
          event.target.value = "";
        }}
      />
      {/* Os formatos só para quem usa leitor de tela: a tela fica sem texto a mais. */}
      <span id={hintId} className="visually-hidden">
        Um arquivo: Word, PDF ou texto.
      </span>
      <div className="entry-matrix-actions">
        {/* Sempre o mesmo botão: o foco não se perde ao escolher ou trocar o arquivo. */}
        <button
          type="button"
          id="upload-choose-matrix"
          className="entry-btn"
          ref={chooseRef}
          aria-describedby={hintId}
          onClick={() => inputRef.current?.click()}
        >
          {file ? (
            <RefreshCw size={18} aria-hidden="true" />
          ) : (
            <Upload size={18} aria-hidden="true" />
          )}
          {file ? "Trocar" : "Enviar arquivo"}
        </button>
        {file && (
          <button
            type="button"
            className="entry-icon-btn"
            aria-label={`Remover ${file.name}`}
            onClick={() => {
              setNote("");
              onRemove();
              chooseRef.current?.focus();
            }}
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      {note && (
        <p className="entry-note entry-matrix-note" role="status">
          {note}
        </p>
      )}
      <span className="visually-hidden" aria-live="polite">
        {file ? `Matriz: ${file.name}` : ""}
      </span>
    </div>
  );
}

/* --- Arquivo escolhido (lista das caixas) --- */
function FileRow({ file, onRemove }: { file: File; onRemove: () => void }) {
  const big = isTooBig(file);
  return (
    <li className="entry-file" data-big={big || undefined}>
      <span className="entry-file-name">
        <Breakable text={file.name} />
      </span>
      <span className="entry-file-size">
        {formatBytes(file.size)}
        {big && tooBigNote}
      </span>
      <button
        type="button"
        className="entry-icon-btn"
        aria-label={`Remover ${file.name}`}
        onClick={onRemove}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </li>
  );
}

/* --- Tarefas e Quizzes: áreas de arrastar, vários arquivos --- */
export function DropZone({
  group,
  title,
  icon,
  files,
  onAdd,
  onRemove,
}: {
  group: "tasks" | "quizzes";
  title: string;
  icon: ReactNode;
  files: File[];
  onAdd: (files: File[]) => string;
  onRemove: (index: number) => void;
}) {
  const titleId = useId();
  const chooseId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const chooseRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const refocus = useRef<number | null>(null);
  const [note, setNote] = useState("");
  const { dragging, dropProps } = useFileDrop((dropped) =>
    setNote(onAdd(dropped)),
  );
  const count = files.length;

  // Depois de remover, o foco vai para o próximo arquivo ou para o botão de escolher.
  // O botão de escolher é sempre o mesmo elemento: ao adicionar, o foco fica onde está.
  useEffect(() => {
    if (refocus.current === null) return;
    const index = refocus.current;
    refocus.current = null;
    const buttons = listRef.current?.querySelectorAll("button");
    const next =
      buttons && buttons.length > 0
        ? buttons[Math.min(index, buttons.length - 1)]
        : chooseRef.current;
    next?.focus();
  }, [files]);

  return (
    <div
      className="entry-zone"
      id={`upload-group-${group}`}
      role="group"
      aria-labelledby={titleId}
      data-dragging={dragging}
      data-filled={count > 0}
      data-drop="Solte para adicionar"
      {...dropProps}
    >
      <div className="entry-zone-head">
        <span className="entry-icon" aria-hidden="true">
          {icon}
        </span>
        <h2 id={titleId} className="entry-card-title">
          {title}
        </h2>
        {/* Só a Matriz é pedida: Tarefas e Quizzes dizem que são opcionais enquanto estão vazias. */}
        <span className="entry-optional" hidden={count > 0}>
          (opcional)
        </span>
        <span className="entry-count" hidden={count === 0} aria-hidden="true">
          {count}
        </span>
        <span className="visually-hidden" aria-live="polite" aria-atomic="true">
          {`${title}: ${count} ${plural(count, "arquivo", "arquivos")}`}
        </span>
      </div>
      <input
        id={`upload-${group}`}
        ref={inputRef}
        className="visually-hidden"
        type="file"
        multiple
        accept={ACCEPT}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          setNote(onAdd(Array.from(event.target.files ?? [])));
          event.target.value = "";
        }}
      />
      {count === 0 ? (
        <p className="entry-zone-empty">
          <CloudUpload size={22} aria-hidden="true" />
          Arraste aqui
        </p>
      ) : (
        <ul className="entry-files" ref={listRef}>
          {files.map((file, index) => (
            <FileRow
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              file={file}
              onRemove={() => {
                refocus.current = index;
                setNote("");
                onRemove(index);
              }}
            />
          ))}
        </ul>
      )}
      {note && (
        <p className="entry-note" role="status">
          {note}
        </p>
      )}
      <button
        type="button"
        id={chooseId}
        className="entry-btn entry-choose"
        ref={chooseRef}
        aria-labelledby={`${chooseId} ${titleId}`}
        onClick={() => inputRef.current?.click()}
      >
        <Plus size={18} aria-hidden="true" />
        Escolher arquivos
      </button>
    </div>
  );
}
