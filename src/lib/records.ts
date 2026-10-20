/** Máximo de marcas de tiempo (ordenadas) dentro de cualquier ventana de [windowMs]. */
export function bestInWindow(times: number[], windowMs: number): number {
  let best = 0
  let start = 0
  for (let end = 0; end < times.length; end++) {
    while (times[end] - times[start] >= windowMs) start++
    best = Math.max(best, end - start + 1)
  }
  return best
}
