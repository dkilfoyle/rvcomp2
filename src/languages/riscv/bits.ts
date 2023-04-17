export const maskBits = (hi: number, lo: number = hi) => {
  let mask = 0;
  for (let i = lo, j = 0; i <= hi; i++, j++) mask |= 1 << j;
  return [lo, mask];
};

export const signExtend = (value: number, bits: number) => {
  const shift = 31 - bits;
  return (value << shift) >> shift;
};

export const getBits = (n: number, end: number, start: number) => {
  return (n >> start) & ((1 << (end - start)) - 1);
};

export function signed(x: number) {
  return x | 0;
}

export function unsigned(x: number) {
  return x >>> 0;
}

export function toHex(x: number, width = 8) {
  return unsigned(x).toString(16).padStart(width, "0");
}

export function signedSlice(word: number, left: number, right: number, pos = 0) {
  const sl = 31 - left;
  word <<= sl;
  word >>= right + sl;
  return word << pos;
}

export function unsignedSlice(word: number, left: number, right: number, pos = 0) {
  const sl = 31 - left;
  word <<= sl;
  word >>>= right + sl;
  return word << pos;
}

export function getByte(word: number, byte: number) {
  if (byte === 0) throw new Error("byte is indexed from 1");
  return unsignedSlice(word, byte * 8 - 1, (byte - 1) * 8);
}

export function getBytes(word: number) {
  return [getByte(word, 4), getByte(word, 3), getByte(word, 2), getByte(word, 1)];
}

export const formatHex = (x: number) => `${x.toString(16).padStart(8, "0")}`;
