"use client";
import React, { useState } from "react";

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export function ImageWithFallback({ src, fallbackSrc, alt, ...rest }: ImageWithFallbackProps) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1a1a2e",
          ...rest.style,
        }}
        className={rest.className}
      >
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="8" fill="#2979FF" fillOpacity="0.1" />
          <path d="M12 36l8-10 6 7 5-6 7 9H12z" fill="#2979FF" fillOpacity="0.4" />
          <circle cx="20" cy="18" r="4" fill="#2979FF" fillOpacity="0.4" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      {...rest}
    />
  );
}
