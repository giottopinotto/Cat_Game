import { useMemo } from 'react';
import { encode } from 'uqr';

/** QR code disegnato come SVG (niente immagini esterne). */
export function QrCode({ text, size = 240, ecc = 'M' }: { text: string; size?: number; ecc?: 'L' | 'M' | 'Q' | 'H' }) {
  const { d, n } = useMemo(() => {
    const qr = encode(text, { ecc, border: 2 });
    let path = '';
    qr.data.forEach((row, y) =>
      row.forEach((on, x) => {
        if (on) path += `M${x} ${y}h1v1h-1z`;
      }),
    );
    return { d: path, n: qr.size };
  }, [text, ecc]);
  return (
    <svg className="qr" viewBox={`0 0 ${n} ${n}`} width={size} height={size} shapeRendering="crispEdges" role="img" aria-label="QR code">
      <rect width={n} height={n} fill="#fff" />
      <path d={d} fill="#2a2440" />
    </svg>
  );
}
