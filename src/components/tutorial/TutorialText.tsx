import { Fragment } from "react";
import type { Block } from "./content/types";
import { paragraphs, parseInline } from "./markup";

/** One line of tutorial markup (no HTML is ever interpreted). */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((token, index) => {
        switch (token.kind) {
          case "bold":
            return <strong key={index}>{token.text}</strong>;
          case "italic":
            return <em key={index}>{token.text}</em>;
          case "code":
            return <code key={index}>{token.text}</code>;
          case "math":
            return (
              <span key={index} className="tut-math">
                {token.text}
              </span>
            );
          default:
            return <Fragment key={index}>{token.text}</Fragment>;
        }
      })}
    </>
  );
}

/** A text, math, list or note block (widgets are rendered by TutorialScreen). */
export function TextBlock({ block }: { block: Exclude<Block, { kind: "widget" }> }) {
  switch (block.kind) {
    case "text":
      return (
        <>
          {paragraphs(block.text).map((p, i) => (
            <p key={i}>
              <Inline text={p} />
            </p>
          ))}
        </>
      );
    case "math":
      return <p className="tut-formula">{block.text}</p>;
    case "list":
      return (
        <ul className="tut-list">
          {block.items.map((item, i) => (
            <li key={i}>
              <Inline text={item} />
            </li>
          ))}
        </ul>
      );
    case "note":
      return (
        <aside className="tut-note">
          <strong>{block.title}</strong>
          {paragraphs(block.text).map((p, i) => (
            <p key={i}>
              <Inline text={p} />
            </p>
          ))}
        </aside>
      );
  }
}
