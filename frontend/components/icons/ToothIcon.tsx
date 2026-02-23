import { ImgHTMLAttributes } from "react";

/**
 * Ícone de dente usando o SVG do projeto (src/img/dente.svg), copiado para public/img.
 */
export function ToothIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src="/img/dente.svg"
      alt=""
      role="img"
      aria-hidden
      {...props}
    />
  );
}
