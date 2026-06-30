import { useEffect, useState } from "react";

export interface Size {
  width: number;
  height: number;
}

// ResizeObserver-based size tracker. Returns {width:0,height:0} until the
// element mounts, then updates on every size change.
export function useElementSize<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return size;
}

// Compute the rendered rect (centered) of an aspect-AR image inside a box
// of (boxW, boxH), simulating CSS object-fit: contain.
export function computeFitBox(
  boxW: number,
  boxH: number,
  ratio: number, // image width / height
): { width: number; height: number; left: number; top: number } {
  if (boxW <= 0 || boxH <= 0) {
    return { width: 0, height: 0, left: 0, top: 0 };
  }
  const fitByWidth = boxW / ratio <= boxH;
  const width = fitByWidth ? boxW : boxH * ratio;
  const height = fitByWidth ? boxW / ratio : boxH;
  const left = (boxW - width) / 2;
  const top = (boxH - height) / 2;
  return { width, height, left, top };
}

// Map a normalized point on the source image (0..1) to viewport % for
// object-fit: cover (edge-to-edge, centered crop).
export function coverPointToPercent(
  boxW: number,
  boxH: number,
  imageRatio: number,
  px: number,
  py: number,
): { left: number; top: number } {
  if (boxW <= 0 || boxH <= 0) {
    return { left: 0, top: 0 };
  }
  const boxRatio = boxW / boxH;
  let renderedW: number;
  let renderedH: number;
  let offsetX: number;
  let offsetY: number;
  if (boxRatio > imageRatio) {
    renderedH = boxH;
    renderedW = boxH * imageRatio;
    offsetX = (boxW - renderedW) / 2;
    offsetY = 0;
  } else {
    renderedW = boxW;
    renderedH = boxW / imageRatio;
    offsetX = 0;
    offsetY = (boxH - renderedH) / 2;
  }
  return {
    left: ((offsetX + px * renderedW) / boxW) * 100,
    top: ((offsetY + py * renderedH) / boxH) * 100,
  };
}
