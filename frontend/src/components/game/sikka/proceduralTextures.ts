/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

/**
 * Creates procedural textures via HTML5 2D Canvas.
 * All textures set SRGBColorSpace and high anisotropy for crisp rendering at shallow angles.
 */

// Helper to configure texture standard properties
function setupTexture(canvas: HTMLCanvasElement, maxAnisotropy = 4, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Coral stone & sandy gypsum plaster texture.
 * Authentic 19th-century Emirati Bastakiya architecture.
 */
export function createLimewashTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.createImageData(512, 512);
  // Periodic multi-scale variation keeps repeated plaster seamless. Grain is
  // deliberately restrained; depth comes from architecture rather than inked bricks.
  let seed = 8137;
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const u = x * Math.PI * 2 / 512;
      const v = y * Math.PI * 2 / 512;
      const broad = Math.sin(u * 2 + Math.sin(v * 3)) * 5 + Math.cos(v * 4 + Math.sin(u)) * 3;
      const pores = (seed / 4294967296 - 0.5) * 14;
      const fleck = seed % 97 === 0 ? -13 : 0;
      const index = (y * 512 + x) * 4;
      pixels.data[index] = 205 + broad + pores + fleck;
      pixels.data[index + 1] = 191 + broad + pores + fleck;
      pixels.data[index + 2] = 165 + broad + pores + fleck;
      pixels.data[index + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return setupTexture(canvas, 4, 1, 1);
}

export function createCoralStoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Warm desert sand & aged gypsum base
  ctx.fillStyle = '#caa981';
  ctx.fillRect(0, 0, 1024, 1024);

  // Irregular coral stone masonry blocks
  const bRows = 8;
  const bH = 1024 / bRows;
  for (let r = 0; r < bRows; r++) {
    const y = r * bH;
    // Mortar horizontal joint
    ctx.strokeStyle = 'rgba(92, 70, 48, 0.45)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, y + (Math.sin(r * 2.3) * 6));
    ctx.lineTo(1024, y + (Math.cos(r * 1.7) * 6));
    ctx.stroke();

    // Vertical stone block dividers
    let curX = (r % 2) * 80;
    while (curX < 1024) {
      const blockW = 120 + Math.random() * 90;
      ctx.strokeStyle = 'rgba(92, 70, 48, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(curX, y);
      ctx.lineTo(curX + (Math.random() - 0.5) * 12, y + bH);
      ctx.stroke();

      // Stone block subtle shade variation
      const blockTones = ['rgba(175, 142, 105, 0.18)', 'rgba(215, 185, 148, 0.22)', 'rgba(145, 115, 82, 0.2)'];
      ctx.fillStyle = blockTones[Math.floor(Math.random() * blockTones.length)];
      ctx.fillRect(curX + 2, y + 2, blockW - 4, bH - 4);

      curX += blockW;
    }
  }

  // Subtle mottling & porous coral sea-rock pores
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = Math.random() * 3.5 + 1;
    const alpha = Math.random() * 0.25;
    ctx.fillStyle = Math.random() > 0.4 ? `rgba(105, 82, 56, ${alpha})` : `rgba(240, 222, 192, ${alpha * 1.4})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Horizontal plaster trowel striations
  for (let y = 0; y < 1024; y += 5) {
    const alpha = Math.random() * 0.12;
    ctx.strokeStyle = `rgba(138, 108, 75, ${alpha})`;
    ctx.lineWidth = Math.random() * 3 + 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y + (Math.random() - 0.5) * 8);
    ctx.stroke();
  }

  // Coral rock sea-shell fossil impressions
  for (let i = 0; i < 60; i++) {
    const cx = Math.random() * 1024;
    const cy = Math.random() * 1024;
    const size = 12 + Math.random() * 24;
    ctx.strokeStyle = 'rgba(85, 62, 40, 0.32)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 1.6);
    ctx.stroke();

    ctx.fillStyle = 'rgba(110, 84, 56, 0.2)';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  return setupTexture(canvas, 4, 3, 2);
}

/**
 * Authentic Old Dubai Sikka flagstone & cobblestone street paver texture.
 * Features warm desert sandstone, chiseled edges, dark recessed mortar joints,
 * and natural stone variation.
 */
export function createFlagstoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Deep earthy sand mortar joints
  ctx.fillStyle = '#332316';
  ctx.fillRect(0, 0, 1024, 1024);

  // Micro-sand noise in mortar
  for (let i = 0; i < 8000; i++) {
    const alpha = Math.random() * 0.35;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(20, 13, 8, ${alpha})` : `rgba(85, 62, 40, ${alpha})`;
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
  }

  // Cobblestone / flagstone blocks
  const rows = 16;
  const cols = 10;
  const cellH = 1024 / rows;
  const cellW = 1024 / cols;

  for (let r = 0; r < rows; r++) {
    const rowOffset = (r % 2) * (cellW * 0.5);
    for (let c = -1; c <= cols + 1; c++) {
      const x = c * cellW + rowOffset + 3;
      const y = r * cellH + 3;
      const w = cellW - 6;
      const h = cellH - 6;

      // Authentic weathered Emirati sandstone palette
      const tones = [
        ['#9e7447', '#805932'],
        ['#b38758', '#946a3d'],
        ['#8a6035', '#6f4924'],
        ['#a77c4e', '#885e33'],
        ['#7c532b', '#613e1c'],
        ['#91673c', '#754e26'],
        ['#ba9163', '#9c7346'],
        ['#855b32', '#69431e'],
        ['#aa8153', '#8c6336'],
        ['#724923', '#573414'],
      ];
      const tonePair = tones[(r * 7 + c + 20) % tones.length];

      // Pillowed stone gradient fill
      const stoneGrad = ctx.createLinearGradient(x, y, x + w, y + h);
      stoneGrad.addColorStop(0, tonePair[0]);
      stoneGrad.addColorStop(1, tonePair[1]);
      ctx.fillStyle = stoneGrad;

      // Rounded cobblestone block
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, [6, 6, 6, 6]);
      ctx.fill();

      // Top & Left sunlit bevel highlight
      ctx.strokeStyle = 'rgba(255, 230, 185, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + 3, y + h - 4);
      ctx.lineTo(x + 3, y + 4);
      ctx.lineTo(x + w - 4, y + 4);
      ctx.stroke();

      // Bottom & Right deep shadow bevel
      ctx.strokeStyle = 'rgba(25, 14, 6, 0.65)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + w - 3, y + 4);
      ctx.lineTo(x + w - 3, y + h - 3);
      ctx.lineTo(x + 4, y + h - 3);
      ctx.stroke();

      // Internal stone chisel striations & mineral flecks
      for (let s = 0; s < 5; s++) {
        const sx = x + 8 + Math.random() * (w - 16);
        const sy = y + 6 + Math.random() * (h - 12);
        const slen = 6 + Math.random() * 18;
        ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(50, 32, 15, 0.25)' : 'rgba(255, 240, 210, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + slen, sy + (Math.random() - 0.5) * 6);
        ctx.stroke();
      }
    }
  }

  // Scattered sand grains clustered in joints
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(225, 195, 145, ${Math.random() * 0.4})`;
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
  }

  return setupTexture(canvas, 8, 1, 1);
}

/**
 * 1024x1024 Grayscale Height / Bump Map for Flagstone Pavers.
 * Encodes stone height and deep crevices to create genuine 3D tactile relief.
 */
export function createFlagstoneBumpMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Darkest deep valleys for joints
  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, 1024, 1024);

  const rows = 16;
  const cols = 10;
  const cellH = 1024 / rows;
  const cellW = 1024 / cols;

  for (let r = 0; r < rows; r++) {
    const rowOffset = (r % 2) * (cellW * 0.5);
    for (let c = -1; c <= cols + 1; c++) {
      const x = c * cellW + rowOffset + 3;
      const y = r * cellH + 3;
      const w = cellW - 6;
      const h = cellH - 6;

      // Pillowed 3D stone dome gradient
      const cx = x + w * 0.45;
      const cy = y + h * 0.45;
      const radius = Math.max(w, h) * 0.65;
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.65, '#b0b0b0');
      grad.addColorStop(0.92, '#505050');
      grad.addColorStop(1, '#181818');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, [6, 6, 6, 6]);
      ctx.fill();

      // Sharp bevel edges
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + h - 2);
      ctx.lineTo(x + 2, y + 2);
      ctx.lineTo(x + w - 2, y + 2);
      ctx.stroke();

      ctx.strokeStyle = '#101010';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + w - 2, y + 2);
      ctx.lineTo(x + w - 2, y + h - 2);
      ctx.lineTo(x + 2, y + h - 2);
      ctx.stroke();
    }
  }

  // Chisel micro-noise for physical stone roughness
  for (let i = 0; i < 6000; i++) {
    const v = Math.floor(Math.random() * 60) + 100;
    ctx.fillStyle = `rgba(${v}, ${v}, ${v}, 0.25)`;
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
  }

  return setupTexture(canvas, 8, 1, 1);
}

/**
 * Celestial Arabic Astrolabe texture for the golden hero rolling sphere.
 * Contains geometric rete, astrolabe quadrants, Arabic celestial indices, and constellations.
 */
export function createAstrolabeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Rich reflective golden bronze foundation
  const grad = ctx.createRadialGradient(512, 512, 50, 512, 512, 512);
  grad.addColorStop(0, '#f9df88');
  grad.addColorStop(0.4, '#e5be52');
  grad.addColorStop(0.85, '#b88924');
  grad.addColorStop(1, '#7a5410');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Astrolabe concentric rings (almucantars and azimuths)
  ctx.lineWidth = 2;
  const radii = [80, 150, 220, 290, 360, 420, 480];
  radii.forEach((r, idx) => {
    ctx.strokeStyle = idx % 2 === 0 ? 'rgba(50, 30, 5, 0.65)' : 'rgba(255, 240, 180, 0.45)';
    ctx.beginPath();
    ctx.arc(512, 512, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Degree ticks around the outer border
  for (let deg = 0; deg < 360; deg += 3) {
    const rad = (deg * Math.PI) / 180;
    const isMajor = deg % 15 === 0;
    const rIn = isMajor ? 450 : 470;
    const rOut = 485;

    ctx.strokeStyle = isMajor ? 'rgba(40, 22, 4, 0.85)' : 'rgba(60, 35, 10, 0.5)';
    ctx.lineWidth = isMajor ? 2.5 : 1.2;
    ctx.beginPath();
    ctx.moveTo(512 + Math.cos(rad) * rIn, 512 + Math.sin(rad) * rIn);
    ctx.lineTo(512 + Math.cos(rad) * rOut, 512 + Math.sin(rad) * rOut);
    ctx.stroke();
  }

  // Geometric Rete stars and pointers
  ctx.strokeStyle = 'rgba(75, 45, 10, 0.7)';
  ctx.lineWidth = 3;
  for (let a = 0; a < 8; a++) {
    const angle = (a * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(512, 512);
    const endX = 512 + Math.cos(angle) * 410;
    const endY = 512 + Math.sin(angle) * 410;
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Star pointer fleur-de-lis tip
    ctx.fillStyle = '#fff0b0';
    ctx.beginPath();
    ctx.arc(endX, endY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Center celestial star rosette
  ctx.fillStyle = '#5c3a08';
  ctx.beginPath();
  ctx.arc(512, 512, 35, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ffe894';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(512, 512, 35, 0, Math.PI * 2);
  ctx.stroke();

  return setupTexture(canvas, 8, 1, 1);
}

/**
 * UAE Dirham Coin texture with traditional Dhow boat relief and rim beading.
 */
export function createDirhamCoinTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Brilliant polished gold gradient
  const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
  grad.addColorStop(0, '#fff4b8');
  grad.addColorStop(0.5, '#e4b638');
  grad.addColorStop(0.85, '#ab7c18');
  grad.addColorStop(1, '#664508');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Coin outer rim
  ctx.strokeStyle = 'rgba(90, 60, 10, 0.7)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(256, 256, 240, 0, Math.PI * 2);
  ctx.stroke();

  // Decorative beaded rim
  for (let i = 0; i < 48; i++) {
    const angle = (i * Math.PI * 2) / 48;
    const bx = 256 + Math.cos(angle) * 230;
    const by = 256 + Math.sin(angle) * 230;
    ctx.fillStyle = '#ffeaa0';
    ctx.beginPath();
    ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dhow boat silhouette (UAE traditional seafaring vessel)
  ctx.fillStyle = '#6e4708';
  ctx.beginPath();
  // Hull
  ctx.moveTo(140, 280);
  ctx.quadraticCurveTo(256, 320, 370, 260);
  ctx.lineTo(360, 285);
  ctx.quadraticCurveTo(256, 335, 150, 295);
  ctx.closePath();
  ctx.fill();

  // Large triangular lateen sail
  ctx.beginPath();
  ctx.moveTo(250, 140);
  ctx.lineTo(340, 255);
  ctx.quadraticCurveTo(260, 245, 235, 265);
  ctx.closePath();
  ctx.fill();

  // Water waves below
  ctx.strokeStyle = '#6e4708';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(200, 335, 30, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(256, 335, 30, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(312, 335, 30, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();

  // Embossed highlight overlay
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  return setupTexture(canvas, 4, 1, 1);
}

/**
 * Traditional Emirati Sadu fabric pattern (crimson red, deep black, bone white geometric diamonds).
 */
export function createSaduFabricTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep crimson foundation
  ctx.fillStyle = '#8b1e22';
  ctx.fillRect(0, 0, 512, 512);

  // Black and bone stripes
  const bandHeight = 64;
  for (let y = 0; y < 512; y += bandHeight * 2) {
    ctx.fillStyle = '#181414';
    ctx.fillRect(0, y, 512, bandHeight);

    // Bone white diamond chevron strip
    ctx.fillStyle = '#ede5d5';
    for (let x = 0; x < 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, y + bandHeight * 0.5);
      ctx.lineTo(x + 16, y + 10);
      ctx.lineTo(x + 32, y + bandHeight * 0.5);
      ctx.lineTo(x + 16, y + bandHeight - 10);
      ctx.closePath();
      ctx.fill();

      // Inner crimson diamond
      ctx.fillStyle = '#a62429';
      ctx.beginPath();
      ctx.moveTo(x + 6, y + bandHeight * 0.5);
      ctx.lineTo(x + 16, y + 18);
      ctx.lineTo(x + 26, y + bandHeight * 0.5);
      ctx.lineTo(x + 16, y + bandHeight - 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ede5d5';
    }
  }

  // Subtle woven wool grain
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1, 2);
  }

  return setupTexture(canvas, 4, 2, 2);
}

/**
 * Carved Teak Arabian door & signboard wood texture.
 */
export function createTeakWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#4a2c16';
  ctx.fillRect(0, 0, 512, 512);

  // Vertical wood grains
  for (let x = 0; x < 512; x += 3) {
    const alpha = Math.random() * 0.25;
    ctx.strokeStyle = Math.random() > 0.5 ? `rgba(32, 16, 6, ${alpha})` : `rgba(102, 64, 34, ${alpha})`;
    ctx.lineWidth = Math.random() * 3 + 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(
      x + (Math.random() - 0.5) * 20, 170,
      x + (Math.random() - 0.5) * 20, 340,
      x, 512,
    );
    ctx.stroke();
  }

  // Brass studs and floral carving accents
  for (let y = 60; y < 512; y += 120) {
    for (let x = 60; x < 512; x += 120) {
      // Brass rosette stud
      ctx.fillStyle = '#c79c3b';
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff2b3';
      ctx.beginPath();
      ctx.arc(x - 2, y - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#2d1808';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  return setupTexture(canvas, 4, 1, 2);
}

/**
 * Realistic ribbed pumpkin texture with warm orange tones and earthy grooves.
 */
export function createPumpkinTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm pumpkin orange foundation
  const baseGrad = ctx.createLinearGradient(0, 0, 0, 512);
  baseGrad.addColorStop(0, '#c75812');
  baseGrad.addColorStop(0.5, '#ea721d');
  baseGrad.addColorStop(1, '#a64208');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Vertical pumpkin ribs & darker shading between segments
  const ribCount = 14;
  const ribW = 512 / ribCount;
  for (let r = 0; r < ribCount; r++) {
    const rx = r * ribW;
    // Highlight in rib center
    const ribGrad = ctx.createLinearGradient(rx, 0, rx + ribW, 0);
    ribGrad.addColorStop(0, 'rgba(110, 40, 5, 0.45)');
    ribGrad.addColorStop(0.2, 'rgba(255, 170, 70, 0.1)');
    ribGrad.addColorStop(0.5, 'rgba(255, 200, 110, 0.35)');
    ribGrad.addColorStop(0.8, 'rgba(255, 170, 70, 0.1)');
    ribGrad.addColorStop(1, 'rgba(110, 40, 5, 0.45)');
    ctx.fillStyle = ribGrad;
    ctx.fillRect(rx, 0, ribW, 512);

    // Deep crevice groove line
    ctx.strokeStyle = 'rgba(75, 26, 4, 0.65)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx, 512);
    ctx.stroke();
  }

  // Subtle organic skin mottling & speckles
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(90, 45, 10, 0.12)' : 'rgba(255, 220, 150, 0.15)';
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }

  return setupTexture(canvas, 4, 1, 1);
}

/**
 * Weathered aged timber wood planks for merchant carts and marketplace stands.
 */
export function createWeatheredCartTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Weathered sun-bleached desert timber
  ctx.fillStyle = '#6e563d';
  ctx.fillRect(0, 0, 512, 512);

  // Planks separated by dark seams
  const plankH = 512 / 8;
  for (let p = 0; p < 8; p++) {
    const py = p * plankH;
    const tone = ['#775d42', '#6b533b', '#806448', '#634c35'][p % 4];
    ctx.fillStyle = tone;
    ctx.fillRect(0, py + 2, 512, plankH - 4);

    // Dark seam
    ctx.fillStyle = '#2b1c11';
    ctx.fillRect(0, py + plankH - 2, 512, 3);

    // Wood grain lines
    for (let x = 0; x < 512; x += 3) {
      const alpha = Math.random() * 0.2;
      ctx.strokeStyle = `rgba(40, 25, 12, ${alpha})`;
      ctx.lineWidth = Math.random() * 2 + 1;
      ctx.beginPath();
      ctx.moveTo(x, py + 2);
      ctx.lineTo(x + (Math.random() - 0.5) * 10, py + plankH - 4);
      ctx.stroke();
    }

    // Iron nail heads at ends
    const nailX = [20, 250, 490];
    nailX.forEach((nx) => {
      ctx.fillStyle = '#1c1c1c';
      ctx.beginPath();
      ctx.arc(nx, py + plankH * 0.5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a8a8a';
      ctx.beginPath();
      ctx.arc(nx - 1, py + plankH * 0.5 - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  return setupTexture(canvas, 4, 2, 2);
}

/**
 * Intricate Persian & Emirati rug weave texture for rolled carpets and hanging tapestries.
 */
export function createPersianCarpetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Deep royal crimson background
  ctx.fillStyle = '#7a141b';
  ctx.fillRect(0, 0, 512, 512);

  // Intricate border bands (indigo navy, antique gold, ivory)
  const borderW = 36;
  ctx.strokeStyle = '#cba348';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 492, 492);

  ctx.strokeStyle = '#182b45';
  ctx.lineWidth = 14;
  ctx.strokeRect(26, 26, 460, 460);

  ctx.strokeStyle = '#f0ebd8';
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, 432, 432);

  // Central ornate floral/diamond medallion
  const cx = 256;
  const cy = 256;
  ctx.fillStyle = '#182b45';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 140, 90, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#cba348';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 105, 65, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7a141b';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 70, 40, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fine woven textile knots
  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1, 2);
  }

  return setupTexture(canvas, 4, 1, 1);
}

/**
 * Authentic bazaar canvas awning texture with vibrant 2-tone stripes and woven cloth texture.
 */
export function createStripedAwningTexture(
  stripeCol1 = '#b54828',
  stripeCol2 = '#f4e6cd',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const stripeWidth = 512 / 10;
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? stripeCol1 : stripeCol2;
    ctx.fillRect(i * stripeWidth, 0, stripeWidth, 512);

    // Crease / seam shadow between stripes
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(i * stripeWidth, 0, 2, 512);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(i * stripeWidth + 2, 0, 2, 512);
  }

  // Woven cloth weave micro-texture
  for (let y = 0; y < 512; y += 4) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, y, 512, 1);
  }
  for (let x = 0; x < 512; x += 4) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(x, 0, 1, 512);
  }

  // Bottom scalloped / valance fringe edge
  ctx.fillStyle = '#1c140d';
  ctx.fillRect(0, 500, 512, 12);
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? stripeCol1 : stripeCol2;
    ctx.beginPath();
    ctx.arc(i * stripeWidth + stripeWidth * 0.5, 500, stripeWidth * 0.45, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#3a2618';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  return setupTexture(canvas, 4, 1, 1);
}

/**
 * Coarse woven burlap / jute texture for authentic market spice and grain sacks.
 */
export function createBurlapSackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm coarse tan jute base
  ctx.fillStyle = '#b39369';
  ctx.fillRect(0, 0, 512, 512);

  // Cross-hatch burlap weave fibers
  for (let y = 0; y < 512; y += 5) {
    for (let x = 0; x < 512; x += 5) {
      const dark = Math.random() > 0.5;
      ctx.fillStyle = dark ? 'rgba(92, 69, 44, 0.35)' : 'rgba(235, 214, 185, 0.28)';
      ctx.fillRect(x + (y % 2) * 2, y, 3, 4);
    }
  }

  // Stenciled heritage warehouse shipping mark
  ctx.fillStyle = 'rgba(50, 32, 18, 0.65)';
  ctx.font = 'bold 36px serif';
  ctx.textAlign = 'center';
  ctx.fillText('BASTAKIYA 1890', 256, 230);
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('١٠٠ كغ', 256, 290);

  // Stencil diamond border
  ctx.strokeStyle = 'rgba(50, 32, 18, 0.55)';
  ctx.lineWidth = 4;
  ctx.strokeRect(90, 150, 332, 180);

  return setupTexture(canvas, 4, 1, 1);
}

/**
 * Decorative Islamic / Iznik turquoise and cobalt mosaic tile texture.
 */
export function createCeramicTileTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f4c6e';
  ctx.fillRect(0, 0, 512, 512);

  const tileSize = 64;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const x = c * tileSize;
      const y = r * tileSize;

      ctx.fillStyle = (r + c) % 2 === 0 ? '#1b7a9e' : '#0c5273';
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

      // Star motif
      ctx.fillStyle = '#f0c05a';
      ctx.beginPath();
      ctx.arc(x + tileSize / 2, y + tileSize / 2, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 6, y + 6, tileSize - 12, tileSize - 12);
    }
  }

  return setupTexture(canvas, 4, 2, 2);
}

/**
 * Watermelon skin texture with wavy dark green and lime stripes.
 */
export function createWatermelonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#448c3b';
  ctx.fillRect(0, 0, 512, 512);

  const stripes = 12;
  const sW = 512 / stripes;
  for (let s = 0; s < stripes; s++) {
    ctx.fillStyle = '#1c4a17';
    ctx.beginPath();
    ctx.moveTo(s * sW, 0);
    for (let y = 0; y <= 512; y += 32) {
      const wave = Math.sin((y / 512) * Math.PI * 4 + s) * 12;
      ctx.lineTo(s * sW + wave, y);
    }
    for (let y = 512; y >= 0; y -= 32) {
      const wave = Math.sin((y / 512) * Math.PI * 4 + s) * 12;
      ctx.lineTo(s * sW + sW * 0.5 + wave, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  return setupTexture(canvas, 4, 1, 1);
}

/**
 * Official UAE National Flag texture according to Federal Law & Protocol standards.
 * 2:1 length-to-height proportion.
 * Vertical Red hoist stripe: 1/4 of total flag length.
 * Three equal horizontal stripes across remaining 3/4 length:
 *   Top: Green (#00732F)
 *   Middle: White (#FFFFFF)
 *   Bottom: Black (#000000)
 * Hoist: Red (#CE1126)
 */
export function createUAEFlagTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256; // Exact 2:1 ratio
  const ctx = canvas.getContext('2d')!;

  const width = 512;
  const height = 256;
  const hoistWidth = 128; // 1/4 of 512
  const flyWidth = 384;   // 3/4 of 512
  const stripeHeight = height / 3; // ~85.33px

  // 1. Horizontal Fly Stripes
  // Top: Green
  ctx.fillStyle = '#00732F';
  ctx.fillRect(hoistWidth, 0, flyWidth, stripeHeight);

  // Middle: White
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(hoistWidth, stripeHeight, flyWidth, stripeHeight);

  // Bottom: Black
  ctx.fillStyle = '#000000';
  ctx.fillRect(hoistWidth, stripeHeight * 2, flyWidth, stripeHeight);

  // 2. Vertical Hoist: Red
  ctx.fillStyle = '#CE1126';
  ctx.fillRect(0, 0, hoistWidth, height);

  // 3. Subtle woven cloth grain overlay
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const grain = (Math.random() - 0.5) * 8;
    d[i] = Math.max(0, Math.min(255, d[i] + grain));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + grain));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + grain));
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}
