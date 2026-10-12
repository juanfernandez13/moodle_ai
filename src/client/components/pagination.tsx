"use client";
export function Pagination({
  page,
  count,
  size = 10,
  onChange,
}: {
  page: number;
  count: number;
  size?: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(count / size));
  return (
    <nav className="pagination" aria-label="Paginação">
      <button
        type="button"
        className="secondary"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </button>
      <span className="field-help">
        {page + 1} de {pages} · {count} itens
      </span>
      <button
        type="button"
        className="secondary"
        disabled={page >= pages - 1}
        onClick={() => onChange(page + 1)}
      >
        Próxima
      </button>
    </nav>
  );
}
