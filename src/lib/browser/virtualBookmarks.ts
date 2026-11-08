export function bookmarkWindow(count: number, width: number, height: number, scrollTop: number, list: boolean) {
  const gap = 5;
  const columns = list ? 1 : Math.max(1, Math.floor((width - gap) / 125));
  const cellHeight = list ? 40 : 100;
  const pitch = cellHeight + gap;
  const rows = Math.ceil(count / columns);
  const startRow = Math.min(Math.max(0, rows - 1), Math.max(0, Math.floor((scrollTop - gap) / pitch) - 3));
  const endRow = Math.min(rows, Math.ceil((scrollTop + height) / pitch) + 3);
  return { columns, cellHeight, pitch, cellWidth: Math.max(0, (width - gap * 2 - gap * (columns - 1)) / columns),
    start: startRow * columns, end: Math.min(count, Math.max(startRow + 1, endRow) * columns), height: rows * pitch + gap };
}
