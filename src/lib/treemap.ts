// Treemap "squarified" (Bruls, Huizing, van Wijk). Acomoda valores como
// rectángulos que llenan EXACTAMENTE el contenedor → siempre forma un
// rectángulo perfecto, sin huecos ni bordes irregulares. Las áreas son
// proporcionales al valor. Devuelve posiciones en las mismas unidades que
// el ancho/alto que se pasen (luego se convierten a %).

export type TreemapTile = { index: number; x: number; y: number; w: number; h: number };

export function squarify(values: number[], width: number, height: number): TreemapTile[] {
  const result: TreemapTile[] = values.map((_, index) => ({ index, x: 0, y: 0, w: 0, h: 0 }));
  const total = values.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0 || width <= 0 || height <= 0) return result;

  // Escala los valores para que su suma equivalga al área del contenedor.
  const scale = (width * height) / total;
  const items = values.map((v, index) => ({ index, area: Math.max(0, v) * scale }));

  // Región libre que se va recortando.
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;

  const worst = (row: { area: number }[], side: number) => {
    if (row.length === 0) return Infinity;
    let s = 0;
    let max = 0;
    let min = Infinity;
    for (const it of row) {
      s += it.area;
      if (it.area > max) max = it.area;
      if (it.area < min) min = it.area;
    }
    const side2 = side * side;
    const s2 = s * s;
    return Math.max((side2 * max) / s2, s2 / (side2 * min));
  };

  const layoutRow = (row: { index: number; area: number }[]) => {
    const s = row.reduce((a, b) => a + b.area, 0);
    if (w >= h) {
      // Columna a la izquierda: ancho fijo = s/h
      const colW = s / h;
      let yy = y;
      for (const it of row) {
        const tileH = it.area / colW;
        result[it.index] = { index: it.index, x, y: yy, w: colW, h: tileH };
        yy += tileH;
      }
      x += colW;
      w -= colW;
    } else {
      // Fila arriba: alto fijo = s/w
      const rowH = s / w;
      let xx = x;
      for (const it of row) {
        const tileW = it.area / rowH;
        result[it.index] = { index: it.index, x: xx, y, w: tileW, h: rowH };
        xx += tileW;
      }
      y += rowH;
      h -= rowH;
    }
  };

  let i = 0;
  let row: { index: number; area: number }[] = [];
  while (i < items.length) {
    const side = Math.min(w, h);
    const next = items[i];
    if (row.length === 0 || worst([...row, next], side) <= worst(row, side)) {
      row.push(next);
      i++;
    } else {
      layoutRow(row);
      row = [];
    }
  }
  if (row.length > 0) layoutRow(row);

  return result;
}
