"use client";
import { useState } from "react";
import type { DatePlan } from "../../../../domain/dates/index.ts";
import {
  dateMoment,
  kindLabel,
  momentText,
  sameInstant,
  spansYears,
} from "../helpers.ts";

const PAGE = 200;

/** Opens and closes of one side of a change ("Antes" or "Depois"), as "20/10 às 00:00". */
function Moments({
  opensAt,
  closesAt,
  offset,
  withYear,
}: {
  opensAt: string | undefined;
  closesAt: string | undefined;
  offset: number;
  withYear: boolean;
}) {
  const opens = dateMoment(opensAt, offset);
  const closes = dateMoment(closesAt, offset);
  if (!opens && !closes) return <span className="dw-none">Sem data</span>;
  return (
    <>
      {opens && (
        <span className="dw-moment">
          <small>Abre</small> {momentText(opens, withYear)}
        </span>
      )}
      {closes && (
        <span className="dw-moment">
          <small>Fecha</small> {momentText(closes, withYear)}
        </span>
      )}
    </>
  );
}

/** Unit or activity, then the dates before and after. Rows scroll inside the table, never the page. */
export function DatePreviewTable({ plan }: { plan: DatePlan }) {
  const [limit, setLimit] = useState(PAGE);
  const offset = plan.input.timezoneOffsetMinutes;
  const withYear = spansYears(plan);
  const rows = plan.changes.slice(0, limit);
  return (
    <div className="dw-table-wrap" tabIndex={0} role="region" aria-label="Antes e depois">
      <table className="dw-table" role="table">
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">
              Unidade ou atividade
            </th>
            <th scope="col" role="columnheader">
              Antes
            </th>
            <th scope="col" role="columnheader">
              Depois
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {rows.map((change) => {
            const changed =
              !sameInstant(change.before.opensAt, change.after.opensAt) ||
              !sameInstant(change.before.closesAt, change.after.closesAt);
            return (
              <tr key={change.id} data-kind={change.kind} role="row">
                <th scope="row" className="dw-what" role="rowheader">
                  <span>{change.title}</span>
                  <small>{kindLabel(change.kind)}</small>
                </th>
                <td data-label="Antes" role="cell">
                  <Moments
                    opensAt={change.before.opensAt}
                    closesAt={change.before.closesAt}
                    offset={offset}
                    withYear={withYear}
                  />
                </td>
                <td data-label="Depois" data-changed={changed} role="cell">
                  <Moments
                    opensAt={change.after.opensAt}
                    closesAt={change.after.closesAt}
                    offset={offset}
                    withYear={withYear}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {plan.changes.length > limit && (
        <button type="button" className="dw-link dw-more" onClick={() => setLimit(limit + PAGE)}>
          Mostrar mais
        </button>
      )}
    </div>
  );
}
