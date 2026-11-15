"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent, ReactNode } from "react";
import {
  CloudUpload,
  Eye,
  FileText,
  Plus,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import {
  UPLOAD_LIMITS,
  formatMegabytes,
} from "../../../../shared/upload-limits.ts";
import { formatBytes } from "../../../download.ts";
import { splitFileName } from "./file-name.ts";
import { FilePreview } from "./file-preview.tsx";

export const ACCEPT = ".docx,.pdf,.txt";
const EXTENSIONS = ["docx", "pdf", "txt"];
const MAX_FILE = formatMegabytes(UPLOAD_LIMITS.maxFileBytes);
const tooBigNote = ` · maior que ${MAX_FILE}`;

export const plural = (count: number, one: string, many: string) =>
  count === 1 ? one : many;
export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}
export const isSupported = (file: File) =>
  EXTENSIONS.includes(extensionOf(file.name));
export const sameFile = (a: File, b: File) =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
const isTooBig = (file: File) => file.size > UPLOAD_LIMITS.maxFileBytes;

/** O formato do arquivo num selo pequeno (DOC, PDF ou TXT), com uma cor para cada um. É enfeite: o nome já traz a extensão. */
function FormatIcon({ name }: { name: string }) {
  const extension = extensionOf(name);
  const label = extension === "pdf" ? "PDF" : extension === "txt" ? "TXT" : "DOC";
  return (
    <span className="entry-format" data-format={label} aria-hidden="true">
      {label}
    </span>
  );
}

/** Nome de arquivo numa linha só: o começo encurta com reticências e a extensão continua à vista. O nome inteiro fica no title. */
function FileName({ name }: { name: string }) {
  const { parts, extension } = splitFileName(name);
  return (
    <span className="entry-file-name" title={name}>
      <span className="entry-file-stem">{parts.join("")}</span>
      {extension && <span className="entry-file-ext">{extension}</span>}
    </span>
  );
}

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

/* --- Matriz: um arquivo só. Uma linha: ícone, nome e um botão; um arquivo solto em cima dela também vale --- */
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
  const viewRef = useRef<HTMLButtonElement>(null);
  const [viewing, setViewing] = useState(false);
  const [note, setNote] = useState("");
  const { dragging, dropProps } = useFileDrop((dropped) =>
    setNote(onAdd(dropped)),
  );
  const big = file !== undefined && isTooBig(file);
  return (
    <div
      className="entry-matrix"
      id="upload-group-planning"
      role="group"
      aria-labelledby={titleId}
      data-filled={file !== undefined}
      data-dragging={dragging}
      data-drop={file ? "Solte para trocar" : "Solte a Matriz"}
      {...dropProps}
    >
      {/* O título fica no alto, à esquerda, como em Tarefas e Quizzes; o formato aceito vem logo ao lado. */}
      <div className="entry-zone-head">
        <span className="entry-icon" aria-hidden="true">
          <FileText size={20} />
        </span>
        <h2 id={titleId} className="entry-card-title">
          Matriz
        </h2>
        {/* Os formatos só para quem usa leitor de tela: a tela fica sem texto a mais. */}
        <span id={hintId} className="visually-hidden">
          Um arquivo: Word, PDF ou texto.
        </span>
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
      <div className="entry-matrix-body">
        {file && (
          <p className="entry-matrix-file" data-big={big || undefined}>
            <FormatIcon name={file.name} />
            <FileName name={file.name} />
            <span className="entry-file-size">
              {formatBytes(file.size)}
              {big && tooBigNote}
            </span>
          </p>
        )}
        <div className="entry-matrix-actions">
          {file && (
            <button
              type="button"
              className="entry-btn"
              ref={viewRef}
              aria-label={`Ver ${file.name}`}
              onClick={() => setViewing(true)}
            >
              <Eye size={18} aria-hidden="true" />
              Ver
            </button>
          )}
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
      </div>
      {note && (
        <p className="entry-note entry-matrix-note" role="status">
          {note}
        </p>
      )}
      <span className="visually-hidden" aria-live="polite">
        {file ? `Matriz: ${file.name}` : ""}
      </span>
      {file && viewing && (
        <FilePreview
          file={file}
          returnFocus={viewRef.current}
          onClose={() => setViewing(false)}
        />
      )}
    </div>
  );
}

/* --- Arquivo escolhido (lista das caixas) --- */
function FileRow({
  file,
  badge,
  onRemove,
}: {
  file: File;
  /** Um selo ao lado do nome (em Só quizzes, a seção de destino do arquivo). */
  badge?: string | undefined;
  onRemove: () => void;
}) {
  const big = isTooBig(file);
  const viewRef = useRef<HTMLButtonElement>(null);
  const [viewing, setViewing] = useState(false);
  return (
    <li className="entry-file" data-big={big || undefined}>
      <FormatIcon name={file.name} />
      <FileName name={file.name} />
      {badge && <span className="entry-file-badge">{badge}</span>}
      <span className="entry-file-size">
        {formatBytes(file.size)}
        {big && tooBigNote}
      </span>
      <button
        type="button"
        className="entry-icon-btn"
        ref={viewRef}
        aria-label={`Ver ${file.name}`}
        title="Ver"
        onClick={() => setViewing(true)}
      >
        <Eye size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="entry-icon-btn"
        aria-label={`Remover ${file.name}`}
        title="Remover"
        onClick={onRemove}
      >
        <X size={18} aria-hidden="true" />
      </button>
      {viewing && (
        <FilePreview
          file={file}
          returnFocus={viewRef.current}
          onClose={() => setViewing(false)}
        />
      )}
    </li>
  );
}

/* --- Tarefas e Quizzes: áreas de arrastar, vários arquivos --- */
export function DropZone({
  group,
  title,
  icon,
  required = false,
  hint,
  badge,
  files,
  onAdd,
  onRemove,
}: {
  group: "tasks" | "quizzes";
  title: string;
  icon: ReactNode;
  /** A área é o que se pede (Só quizzes): não diz "(opcional)". */
  required?: boolean;
  /** Uma frase curta no convite da área vazia. */
  hint?: string | undefined;
  /** Um selo para cada arquivo da lista. */
  badge?: ((file: File, index: number) => string | undefined) | undefined;
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
        <span className="entry-optional" hidden={count > 0 || required}>
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
      {count > 0 && (
        <ul className="entry-files" ref={listRef}>
          {files.map((file, index) => (
            <FileRow
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              file={file}
              badge={badge?.(file, index)}
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
      {/* Vazia: "Arraste aqui" e o botão ficam juntos, no meio da área. Com arquivos, sobra só o botão, embaixo. */}
      <div className="entry-zone-drop">
        {count === 0 && (
          <p className="entry-zone-empty">
            <CloudUpload size={26} aria-hidden="true" />
            Arraste aqui
          </p>
        )}
        <button
          type="button"
          id={chooseId}
          className="entry-pick-files"
          ref={chooseRef}
          aria-labelledby={`${chooseId} ${titleId}`}
          onClick={() => inputRef.current?.click()}
        >
          <Plus size={18} aria-hidden="true" />
          Escolher arquivos
        </button>
        {count === 0 && hint && <p className="entry-zone-hint">{hint}</p>}
      </div>
    </div>
  );
}
