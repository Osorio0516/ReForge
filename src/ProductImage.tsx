import { useState } from "react";
import type { Part } from "./data";
import { catalogImages } from "./catalogImages";

export function ProductImage({ part, height = 160 }: { part: Part; height?: number }) {
  const photo = catalogImages[(part.sku ?? "").trim().toUpperCase()];
  const src = photo ? `${import.meta.env.BASE_URL}${photo.src}` : "";
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <figure style={{ margin: 0, width: "100%", minWidth: 0 }}>
      <div style={{ height, width: "100%", boxSizing: "border-box", background: "#f7f9fc", border: "1px solid #34435a", borderRadius: 12, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {src && failedSrc !== src ? (
          <img src={src} alt={`${part.brand} ${part.name}${photo.note ? " — product-family photo" : ""}`} loading="lazy" decoding="async" onError={() => setFailedSrc(src)} style={{ display: "block", width: "100%", height: "100%", padding: 12, boxSizing: "border-box", objectFit: "contain" }} />
        ) : (
          <span role="img" aria-label={`Photo unavailable for ${part.brand} ${part.name}`} style={{ padding: 16, color: "#475569", textAlign: "center", fontSize: 13 }}>Photo unavailable</span>
        )}
      </div>
      {photo?.note && <figcaption style={{ color: "#94a3b8", fontSize: 11, marginTop: 5, lineHeight: 1.4 }}>{photo.note}</figcaption>}
    </figure>
  );
}
