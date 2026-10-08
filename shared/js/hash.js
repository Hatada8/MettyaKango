/* パスワードの変換（SHA-256）。データベースにはこの値を保存します。
   ブラウザの機能（crypto.subtle）が使えない環境でも同じ結果になるよう、予備の計算も入れています。 */
async function sha256Hex(text){
  const bytes = new TextEncoder().encode(String(text));
  if(window.crypto && window.crypto.subtle){
    try{
      const buf = await window.crypto.subtle.digest('SHA-256', bytes);
      return toHex(new Uint8Array(buf));
    }catch(e){ /* 予備の計算へ */ }
  }
  return toHex(sha256Fallback(bytes));
}

function toHex(bytes){
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function sha256Fallback(bytes){
  const ror = (x, n) => (x >>> n) | (x << (32 - n));
  const frac = x => ((x - Math.floor(x)) * 4294967296) >>> 0;

  // 定数：最初の素数の平方根・立方根の小数部分
  const H = [], K = [];
  for(let n = 2, found = 0; found < 64; n++){
    let prime = true;
    for(let d = 2; d * d <= n; d++){ if(n % d === 0){ prime = false; break; } }
    if(!prime) continue;
    if(found < 8) H[found] = frac(Math.sqrt(n));
    K[found] = frac(Math.cbrt(n));
    found++;
  }

  // 末尾に 1 ビットと長さを足して 64 バイト単位にそろえる
  const len = bytes.length;
  const total = Math.ceil((len + 9) / 64) * 64;
  const msg = new Uint8Array(total);
  msg.set(bytes);
  msg[len] = 0x80;
  const view = new DataView(msg.buffer);
  const bitLen = len * 8;
  view.setUint32(total - 8, Math.floor(bitLen / 4294967296));
  view.setUint32(total - 4, bitLen >>> 0);

  const w = new Uint32Array(64);
  for(let off = 0; off < total; off += 64){
    for(let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for(let i = 16; i < 64; i++){
      const s0 = ror(w[i-15], 7) ^ ror(w[i-15], 18) ^ (w[i-15] >>> 3);
      const s1 = ror(w[i-2], 17) ^ ror(w[i-2], 19) ^ (w[i-2] >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for(let i = 0; i < 64; i++){
      const t1 = (h + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((ror(a, 2) ^ ror(a, 13) ^ ror(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  H.forEach((v, i) => outView.setUint32(i * 4, v));
  return out;
}
