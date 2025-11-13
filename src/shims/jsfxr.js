export default function jsfxrShim() {
  const fn = typeof window !== 'undefined' && window.sfxr;
  if (typeof fn !== 'function') throw new Error('sfxr global not available');
  return fn.apply(window, arguments);
}

export function toArray(params) {
  const fn = typeof window !== 'undefined' && window.sfxr;
  if (fn && typeof fn.toArray === 'function') return fn.toArray(params);
  return params;
}
