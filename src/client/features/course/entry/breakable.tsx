import { Fragment } from "react";
import { splitFileName } from "./file-name.ts";

/** Nome de arquivo que quebra depois de _ - . e espaço, em vez de no meio de uma palavra. A extensão fica colada à palavra de antes. */
export function Breakable({ text }: { text: string }) {
  const { parts, extension } = splitFileName(text);
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part}
          {index < parts.length - 1 && <wbr />}
        </Fragment>
      ))}
      {extension}
    </>
  );
}
