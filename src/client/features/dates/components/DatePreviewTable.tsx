import type { DatePlan } from "../../../../domain/dates/index.ts";
import { Pagination } from "../../../components/pagination.tsx";
import { displayDate } from "../helpers.ts";

interface Props {
  plan: DatePlan;
  page: number;
  onPageChange(page: number): void;
  showKind?: boolean;
}

export function DatePreviewTable({
  plan,
  page,
  onPageChange,
  showKind = false,
}: Props) {
  return (
    <>
      <div className="table-scroll date-preview">
        <table>
          <thead>
            <tr>
              <th>Alvo</th>
              <th>Abertura anterior</th>
              <th>Nova abertura</th>
              <th>Fechamento anterior</th>
              <th>Novo fechamento</th>
            </tr>
          </thead>
          <tbody>
            {plan.changes.slice(page * 10, page * 10 + 10).map((change) => (
              <tr key={change.id}>
                <td>
                  {change.title}
                  {showKind && <small>{change.kind}</small>}
                </td>
                <td>{displayDate(change.before.opensAt)}</td>
                <td>{displayDate(change.after.opensAt)}</td>
                <td>{displayDate(change.before.closesAt)}</td>
                <td>{displayDate(change.after.closesAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} count={plan.changes.length} onChange={onPageChange} />
    </>
  );
}
