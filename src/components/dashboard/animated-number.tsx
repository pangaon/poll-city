"use client";

import { animate } from "framer-motion";
import { useEffect, useRef } from "react";

export default function AnimatedNumber({
  value,
  className,
  format,
  style,
}: {
  value: number;
  className?: string;
  format?: (value: number) => string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const previous = useRef(value);

  useEffect(() => {
    if (!ref.current) return;

    const controls = animate(previous.current, value, {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        if (!ref.current) return;
        const rounded = Math.round(latest);
        ref.current.textContent = format ? format(rounded) : rounded.toLocaleString();
      },
    });

    previous.current = value;
    return () => controls.stop();
  }, [value, format]);

  return (
    <span ref={ref} className={className} style={style}>
      {format ? format(value) : value.toLocaleString()}
    </span>
  );
}
