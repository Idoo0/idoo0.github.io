// Read dimensions from the WebP container, independently of client metadata.
export function webpDimensions(bytes) {
  const invalid=()=>{throw new Error('File harus berupa gambar WebP yang valid.');};
  if (bytes.length<20 || bytes.toString('ascii',0,4)!=='RIFF' || bytes.toString('ascii',8,12)!=='WEBP' || bytes.readUInt32LE(4)!==bytes.length-8) invalid();
  let dimensions,extended;
  for (let offset=12;offset<bytes.length;) {
    if (offset+8>bytes.length) invalid();
    const type=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4),start=offset+8,end=start+size;
    if (end>bytes.length) invalid();
    if (type==='ANIM' || type==='ANMF') invalid();
    if (type==='VP8X') {
      if (size!==10 || bytes[start]&2) invalid();
      extended={width:bytes.readUIntLE(start+4,3)+1,height:bytes.readUIntLE(start+7,3)+1};
    } else if (type==='VP8 ') {
      if (dimensions || size<10 || bytes[start]&1 || bytes.toString('hex',start+3,start+6)!=='9d012a') invalid();
      dimensions={width:bytes.readUInt16LE(start+6)&0x3fff,height:bytes.readUInt16LE(start+8)&0x3fff};
    } else if (type==='VP8L') {
      if (dimensions || size<5 || bytes[start]!==0x2f) invalid();
      const bits=bytes.readUInt32LE(start+1);if (bits>>>29) invalid();
      dimensions={width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1};
    }
    offset=end+(size%2);
    if (offset>bytes.length) invalid();
  }
  if (!dimensions || !dimensions.width || !dimensions.height || extended&&(extended.width!==dimensions.width || extended.height!==dimensions.height)) invalid();
  return dimensions;
}
