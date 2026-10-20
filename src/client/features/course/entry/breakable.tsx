import { Fragment } from "react";

/** Nome de arquivo que quebra depois de _ - . e espaço, em vez de no meio de uma palavra. */
export function Breakable({ text }: { text: string }) {
  // Sem "lookbehind": navegadores mais antigos não o aceitam e a tela inteira falharia.
  const parts = text.match(/[^_.\s-]*[_.\s-]+|[^_.\s-]+/g) ?? [text];
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part}
          {index < parts.length - 1 && <wbr />}
        </Fragment>
      ))}
    </>
  );
}
