import {
  mapStudentRows,
  parseCsv,
  type StudentMapping,
  type StudentRow,
} from "../../domain/students/index.ts";
import * as XLSX from "xlsx";
import { readArchive } from "../../shared/archive.ts";
export type StudentFileInput = {
  name: string;
  bytes: Uint8Array;
  sheet?: string;
  mapping?: StudentMapping;
};
export type StudentFileResult =
  | {
      ok: true;
      rows: StudentRow[];
      matrix: string[][];
      sheet: string;
      sheetNames: string[];
    }
  | {
      ok: false;
      issues: { code: string; message: string }[];
      matrix?: string[][];
      sheetNames?: string[];
    };
export async function parseStudentFile(
  input: StudentFileInput,
): Promise<StudentFileResult> {
  if (input.bytes.byteLength > 8 * 1024 * 1024)
    return {
      ok: false,
      issues: [{ code: "file_limit", message: "Use um arquivo com até 8 MB." }],
    };
  const extension = input.name.toLowerCase().split(".").at(-1);
  if (!["csv", "xlsx", "xls"].includes(extension ?? ""))
    return {
      ok: false,
      issues: [{ code: "invalid_file", message: "Use CSV, XLSX ou XLS." }],
    };
  let matrix: string[][] = [],
    sheetNames: string[] = [],
    sheet = "";
  try {
    if (extension === "csv") {
      matrix = parseCsv(
        new TextDecoder("utf-8", { fatal: true }).decode(input.bytes),
      );
      sheet = "CSV";
      sheetNames = ["CSV"];
    } else {
      if (extension === "xlsx") {
        const entries = await readArchive(input.bytes, {
          maxEntries: 1000,
          maxEntryBytes: 16 * 1024 * 1024,
          maxTotalBytes: 32 * 1024 * 1024,
        });
        if (
          !entries.has("[Content_Types].xml") ||
          !entries.has("xl/workbook.xml")
        )
          throw new Error("invalid workbook");
      } else if (
        !input.bytes
          .subarray(0, 8)
          .every(
            (byte, index) =>
              byte === [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1][index],
          )
      )
        throw new Error("invalid xls signature");
      const book = XLSX.read(input.bytes, {
        type: "array",
        sheetRows: 10_002,
        cellFormula: true,
        cellHTML: false,
        cellNF: false,
        cellStyles: false,
        cellDates: false,
        bookVBA: false,
      });
      if (!book.SheetNames.length || book.SheetNames.length > 100)
        throw new Error("invalid sheets");
      sheetNames = book.SheetNames;
      sheet = input.sheet ?? sheetNames[0]!;
      const selected = book.Sheets[sheet];
      if (!selected)
        return {
          ok: false,
          issues: [
            { code: "invalid_sheet", message: "Selecione uma aba disponível." },
          ],
          sheetNames,
        };
      const range = XLSX.utils.decode_range(
        selected["!fullref"] ?? selected["!ref"] ?? "A1:A1",
      );
      if (range.e.r >= 10_001 || range.e.c >= 64)
        return {
          ok: false,
          issues: [
            {
              code: "sheet_limit",
              message: "Use até 10.000 alunos e 64 colunas.",
            },
          ],
          sheetNames,
        };
      if (
        Object.values(selected).some(
          (cell) => typeof cell === "object" && cell !== null && "f" in cell,
        )
      )
        return {
          ok: false,
          issues: [
            {
              code: "formula_cell",
              message:
                "Converta fórmulas em valores antes da importação para não usar um resultado desatualizado.",
            },
          ],
          sheetNames,
        };
      matrix = XLSX.utils.sheet_to_json<string[]>(selected, {
        header: 1,
        raw: false,
        defval: "",
        blankrows: false,
      });
    }
  } catch {
    return {
      ok: false,
      issues: [
        {
          code: "invalid_file",
          message:
            "Não foi possível ler o arquivo. Confira o formato, a integridade e os limites.",
        },
      ],
    };
  }
  try {
    return {
      ok: true,
      rows: mapStudentRows(matrix, input.mapping),
      matrix,
      sheet,
      sheetNames,
    };
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          code: "mapping_required",
          message:
            error instanceof Error
              ? error.message
              : "Confira o mapeamento de colunas.",
        },
      ],
      matrix,
      sheetNames,
    };
  }
}
