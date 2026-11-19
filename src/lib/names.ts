export function displayName(p: { firstName: string; lastName: string }) {
  return p.firstName ? `${p.lastName}, ${p.firstName}` : p.lastName;
}

export function fmtPoints(v: number) {
  const whole = Math.floor(v);
  const half = v - whole >= 0.5;
  if (!half) return String(whole);
  return whole === 0 ? "½" : `${whole}½`;
}
