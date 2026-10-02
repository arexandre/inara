"use client";

import DOMPurify from "dompurify";

/**
 * Sanitiza HTML perigoso para renderização segura.
 * Remove tags de script, event handlers (onerror, onclick, etc.)
 * e permite apenas markup básico de formatação.
 */
export function sanitizeHTML(dirty: string): string {
  if (typeof window === "undefined") {
    // SSR fallback: strip ALL html tags
    return dirty.replace(/<[^>]*>/g, "");
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "b", "i", "em", "strong", "u", "s", "br", "p", "ul", "ol", "li",
      "span", "div", "h1", "h2", "h3", "h4", "h5", "h6", "a", "code", "pre",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "textarea", "select"],
    FORBID_ATTR: ["onerror", "onclick", "onload", "onmouseover", "onfocus", "onblur"],
  });
}

/**
 * Componente que renderiza HTML sanitizado de forma segura.
 * Substitui o uso direto de dangerouslySetInnerHTML.
 */
export function SafeHTML({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizeHTML(html) }}
    />
  );
}
