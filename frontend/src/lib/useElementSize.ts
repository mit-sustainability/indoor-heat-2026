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
