import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

/* ============================================================
   CASA SERENA — a quiet modern villa at golden hour
   Pure procedural Three.js scene. No external assets.
   ============================================================ */

const container = document.getElementById('stage');
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function rng(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------
   Renderer, camera, controls
------------------------------------------------------------ */
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.03;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd2b296, 90, 620);

const camera = new THREE.PerspectiveCamera(
  39,
  window.innerWidth / window.innerHeight,
  0.15,
  2400
);
const DESKTOP_CAM = new THREE.Vector3(17.0, 7.05, 20.6);
const DESKTOP_TARGET = new THREE.Vector3(0, 3.95, 0.1);
const MOBILE_CAM = new THREE.Vector3(19.2, 8.1, 25.7);
const MOBILE_TARGET = new THREE.Vector3(0, 4.25, 0);
let layoutPortrait = window.innerWidth / window.innerHeight < 0.8;
function homeView() {
  return layoutPortrait
    ? { cam: MOBILE_CAM, target: MOBILE_TARGET, fov: 52 }
    : { cam: DESKTOP_CAM, target: DESKTOP_TARGET, fov: 39 };
}
const HOME = homeView();
camera.fov = HOME.fov;
camera.updateProjectionMatrix();
camera.position.copy(HOME.cam);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME.target);
controls.enableDamping = true;
controls.dampingFactor = 0.048;
controls.enablePan = false;
controls.minDistance = 8.5;
controls.maxDistance = 42;
controls.minPolarAngle = 0.22;
controls.maxPolarAngle = 1.47;
controls.autoRotateSpeed = 0.42;
controls.update();

/* ------------------------------------------------------------
   Procedural textures
------------------------------------------------------------ */
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

function canvasTexture(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  tex.anisotropy = maxAniso;
  return tex;
}

const grassTex = canvasTexture(
  512,
  512,
  (ctx, w, h) => {
    const r = rng(21);
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const x = i % w;
      const y = (i / w) | 0;
      const patch = Math.sin(x * 0.035) * Math.cos(y * 0.028) * 7;
      const grain = (r() - 0.5) * 20;
      const blade = Math.sin(x * 0.7 + y * 0.3) * 2;
      img.data[i * 4] = 78 + patch + grain + blade;
      img.data[i * 4 + 1] = 108 + patch + grain + blade;
      img.data[i * 4 + 2] = 58 + patch * 0.6 + grain * 0.5;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    ctx.globalAlpha = 0.11;
    for (let i = 0; i < 500; i++) {
      ctx.strokeStyle = r() > 0.5 ? '#a6a874' : '#3f4c2e';
      ctx.beginPath();
      const x = r() * w;
      const y = r() * h;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * 6, y - 3 - r() * 5);
      ctx.stroke();
    }
  },
  130,
  130
);

const gravelTex = canvasTexture(
  384,
  384,
  (ctx, w, h) => {
    const r = rng(9);
    ctx.fillStyle = '#a89c88';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 14000; i++) {
      const s = r() * 2.6 + 0.4;
      const v = 122 + r() * 82;
      ctx.fillStyle = `rgba(${v + 12},${v + 6},${v - 5},${0.35 + r() * 0.45})`;
      ctx.beginPath();
      ctx.ellipse(r() * w, r() * h, s, s * (0.6 + r() * 0.6), r() * 3, 0, 7);
      ctx.fill();
    }
  },
  12,
  12
);

const stoneTex = canvasTexture(
  512,
  512,
  (ctx, w, h) => {
    const r = rng(33);
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const n = (r() - 0.5) * 18;
      const cloud =
        Math.sin((i % w) * 0.018 + Math.sin((i / w) * 0.02) * 2) * 5;
      img.data[i * 4] = 196 + n + cloud;
      img.data[i * 4 + 1] = 187 + n + cloud;
      img.data[i * 4 + 2] = 172 + n * 0.9 + cloud;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    ctx.globalAlpha = 0.07;
    for (let i = 0; i < 28; i++) {
      ctx.strokeStyle = r() > 0.5 ? '#f4ecdd' : '#7b7061';
      ctx.lineWidth = 1 + r() * 3;
      ctx.beginPath();
      let x = r() * w;
      let y = r() * h;
      ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += (r() - 0.5) * 80;
        y += (r() - 0.5) * 30;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  },
  3,
  2
);

const woodTex = canvasTexture(512, 512, (ctx, w, h) => {
  const r = rng(4);
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, '#7c4f30');
  g.addColorStop(0.35, '#a06b42');
  g.addColorStop(0.62, '#8a5937');
  g.addColorStop(1, '#a37149');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 240; i++) {
    const x = r() * w;
    ctx.strokeStyle = `rgba(${45 + r() * 45},${25 + r() * 25},${12 + r() * 18},${0.05 + r() * 0.16})`;
    ctx.lineWidth = 0.5 + r() * 2.2;
    ctx.beginPath();
    for (let y = -10; y <= h + 10; y += 14) {
      const wave =
        Math.sin(y * 0.013 + x * 0.02) * (2 + r() * 2) +
        Math.sin(y * 0.004 + i) * 2;
      if (y === -10) ctx.moveTo(x + wave, y);
      else ctx.lineTo(x + wave, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const x = r() * w;
    const y = r() * h;
    ctx.strokeStyle = 'rgba(48,28,16,.24)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.ellipse(x, y + k * 4, 8 + r() * 4, 3 + r() * 3, 0, 0, 7);
      ctx.stroke();
    }
  }
}, 1, 1);

const deckTex = canvasTexture(512, 512, (ctx, w, h) => {
  const r = rng(88);
  ctx.fillStyle = '#a57b57';
  ctx.fillRect(0, 0, w, h);
  const rows = 10;
  for (let row = 0; row < rows; row++) {
    const y = (row * h) / rows;
    const tone = 145 + r() * 30;
    ctx.fillStyle = `rgb(${tone + 18},${tone - 12},${tone - 48})`;
    ctx.fillRect(0, y + 1, w, h / rows - 2);
    for (let i = 0; i < 20; i++) {
      ctx.strokeStyle = `rgba(${72 + r() * 32},${50 + r() * 22},${30 + r() * 15},${0.06 + r() * 0.1})`;
      ctx.lineWidth = 0.7 + r() * 1.4;
      ctx.beginPath();
      const gy = y + 3 + r() * (h / rows - 6);
      for (let x = 0; x <= w; x += 18) {
        const yy = gy + Math.sin(x * 0.025 + row) * 1.5;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(36,23,14,.55)';
    ctx.fillRect(0, y, w, 2);
  }
}, 5, 5);

const artTex = canvasTexture(512, 300, (ctx, w, h) => {
  const r = rng(12);
  ctx.fillStyle = '#d9cdb9';
  ctx.fillRect(0, 0, w, h);
  const blobs = [
    { x: 145, y: 150, rx: 108, ry: 115, c: '#a85f3f', a: 0.84 },
    { x: 300, y: 118, rx: 76, ry: 84, c: '#233c44', a: 0.72 },
    { x: 380, y: 195, rx: 60, ry: 48, c: '#c39a5e', a: 0.6 },
  ];
  blobs.forEach((b) => {
    ctx.beginPath();
    ctx.fillStyle = b.c;
    ctx.globalAlpha = b.a;
    ctx.ellipse(b.x, b.y, b.rx, b.ry, r() * 0.4, 0, 7);
    ctx.fill();
  });
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 30; i++) {
    ctx.strokeStyle = r() > 0.5 ? '#f3e8d5' : '#492e25';
    ctx.lineWidth = 1 + r() * 4;
    ctx.beginPath();
    ctx.moveTo(r() * w, r() * h);
    ctx.bezierCurveTo(r() * w, r() * h, r() * w, r() * h, r() * w, r() * h);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(238,229,213,.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, w - 36, h - 36);
});

const upperRoomTex = canvasTexture(1024, 360, (ctx, w, h) => {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#1d130c');
  bg.addColorStop(0.55, '#4b2f1e');
  bg.addColorStop(1, '#6f452b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const warm = ctx.createRadialGradient(w * 0.57, h * 0.42, 20, w * 0.57, h * 0.42, w * 0.52);
  warm.addColorStop(0, 'rgba(255,171,92,.55)');
  warm.addColorStop(0.5, 'rgba(227,127,62,.16)');
  warm.addColorStop(1, 'rgba(60,30,14,0)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, w, h);

  // vertical timber wall
  for (let x = 0; x < w; x += 26) {
    ctx.fillStyle = x % 52 === 0 ? 'rgba(255,201,142,.045)' : 'rgba(20,10,5,.09)';
    ctx.fillRect(x, 0, 12, h * 0.83);
  }
  // floor
  ctx.fillStyle = '#342218';
  ctx.fillRect(0, h * 0.82, w, h * 0.18);
  ctx.fillStyle = 'rgba(255,186,117,.16)';
  ctx.fillRect(0, h * 0.82, w, 2);

  // bed / headboard
  ctx.fillStyle = '#2b1a10';
  ctx.fillRect(36, h * 0.22, 350, h * 0.72);
  ctx.fillStyle = '#7a5135';
  ctx.fillRect(58, h * 0.22, 306, h * 0.44);
  for (let x = 66; x < 356; x += 18) {
    ctx.fillStyle = 'rgba(35,18,10,.24)';
    ctx.fillRect(x, h * 0.22, 3, h * 0.44);
  }
  const sheet = ctx.createLinearGradient(0, h * 0.63, 0, h * 0.92);
  sheet.addColorStop(0, '#c9b59a');
  sheet.addColorStop(1, '#8d7356');
  ctx.fillStyle = sheet;
  ctx.beginPath();
  ctx.roundRect(76, h * 0.63, 330, h * 0.24, 14);
  ctx.fill();
  ctx.fillStyle = '#d8c6ad';
  ctx.beginPath();
  ctx.roundRect(100, h * 0.56, 110, h * 0.1, 13);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(224, h * 0.56, 108, h * 0.1, 13);
  ctx.fill();
  ctx.fillStyle = '#75604d';
  ctx.fillRect(78, h * 0.84, 328, 8);

  // bedside table + lamp
  ctx.fillStyle = '#301e13';
  ctx.fillRect(426, h * 0.62, 98, 76);
  ctx.fillStyle = '#20140d';
  ctx.fillRect(438, h * 0.62, 74, 6);
  const lamp = ctx.createRadialGradient(475, h * 0.5, 2, 475, h * 0.5, 36);
  lamp.addColorStop(0, 'rgba(255,240,198,1)');
  lamp.addColorStop(0.3, 'rgba(255,193,111,.9)');
  lamp.addColorStop(1, 'rgba(255,160,70,0)');
  ctx.fillStyle = lamp;
  ctx.beginPath();
  ctx.arc(475, h * 0.5, 38, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#312117';
  ctx.fillRect(467, h * 0.53, 16, 22);

  // pendant light
  ctx.strokeStyle = '#1e130c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(692, 0);
  ctx.lineTo(692, 104);
  ctx.stroke();
  const pendant = ctx.createRadialGradient(692, 122, 2, 692, 122, 48);
  pendant.addColorStop(0, 'rgba(255,236,190,1)');
  pendant.addColorStop(0.32, 'rgba(255,188,100,.85)');
  pendant.addColorStop(1, 'rgba(255,150,60,0)');
  ctx.fillStyle = pendant;
  ctx.beginPath();
  ctx.arc(692, 122, 52, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#2f1d11';
  ctx.beginPath();
  ctx.moveTo(672, 104);
  ctx.lineTo(712, 104);
  ctx.lineTo(705, 126);
  ctx.lineTo(679, 126);
  ctx.closePath();
  ctx.fill();

  // plant silhouette
  ctx.strokeStyle = '#1d2418';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(862, h * 0.82);
  ctx.quadraticCurveTo(850, h * 0.58, 872, h * 0.4);
  ctx.stroke();
  ctx.fillStyle = '#283022';
  for (let i = 0; i < 9; i++) {
    const a = -0.9 + i * 0.22;
    ctx.beginPath();
    ctx.ellipse(872 + Math.sin(a) * 58, h * 0.4 - i * 17, 12, 34, a, 0, 7);
    ctx.fill();
  }
  ctx.fillStyle = '#2c1e14';
  ctx.beginPath();
  ctx.roundRect(828, h * 0.76, 70, 52, 6);
  ctx.fill();

  // soft curtain edges
  const curtainL = ctx.createLinearGradient(0, 0, 90, 0);
  curtainL.addColorStop(0, 'rgba(20,12,8,.82)');
  curtainL.addColorStop(1, 'rgba(20,12,8,0)');
  ctx.fillStyle = curtainL;
  ctx.fillRect(0, 0, 90, h);
  const curtainR = ctx.createLinearGradient(w, 0, w - 70, 0);
  curtainR.addColorStop(0, 'rgba(18,10,6,.78)');
  curtainR.addColorStop(1, 'rgba(18,10,6,0)');
  ctx.fillStyle = curtainR;
  ctx.fillRect(w - 70, 0, 70, h);

  // vignette
  const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.65);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,.4)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
});

const poolFloorTex = canvasTexture(512, 512, (ctx, w, h) => {
  const r = rng(55);
  ctx.fillStyle = '#1d4f59';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(132,197,199,.15)';
  ctx.lineWidth = 1.5;
  const tile = 64;
  for (let x = 0; x <= w; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 30; i++) {
    ctx.strokeStyle = `rgba(162,231,232,${0.035 + r() * 0.055})`;
    ctx.lineWidth = 2 + r() * 5;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 18) {
      const y = h * 0.5 + Math.sin(x * 0.025 + i) * (18 + r() * 12) + Math.sin(x * 0.07 + i * 2) * 5;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}, 2, 1);

const addressTex = canvasTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#28251f';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(207,176,128,.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(17, 17, w - 34, h - 34);
  ctx.fillStyle = '#d9bd8c';
  ctx.textAlign = 'center';
  ctx.font = '300 104px Georgia, serif';
  ctx.fillText('07', w / 2, 151);
  ctx.font = '17px Helvetica, Arial';
  ctx.letterSpacing = '5px';
  ctx.fillStyle = 'rgba(220,199,165,.65)';
  ctx.fillText('SERENA', w / 2, 200);
});

const glowTex = canvasTexture(128, 128, (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,244,214,.8)');
  g.addColorStop(0.5, 'rgba(255,205,138,.18)');
  g.addColorStop(1, 'rgba(255,180,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
});
glowTex.wrapS = glowTex.wrapT = THREE.ClampToEdgeWrapping;

const flameTex = canvasTexture(128, 256, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(w / 2, h * 0.72, 4, w / 2, h * 0.6, w * 0.48);
  g.addColorStop(0, 'rgba(255,255,225,1)');
  g.addColorStop(0.2, 'rgba(255,218,120,.95)');
  g.addColorStop(0.52, 'rgba(255,135,44,.52)');
  g.addColorStop(0.8, 'rgba(214,58,12,.12)');
  g.addColorStop(1, 'rgba(120,20,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.02);
  ctx.bezierCurveTo(w * 0.78, h * 0.42, w * 0.92, h * 0.7, w * 0.5, h * 0.98);
  ctx.bezierCurveTo(w * 0.08, h * 0.7, w * 0.22, h * 0.42, w * 0.5, h * 0.02);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
});
flameTex.wrapS = flameTex.wrapT = THREE.ClampToEdgeWrapping;

const starTex = canvasTexture(64, 64, (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.22, 'rgba(240,246,255,.9)');
  g.addColorStop(0.55, 'rgba(180,205,255,.15)');
  g.addColorStop(1, 'rgba(160,190,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
});
starTex.wrapS = starTex.wrapT = THREE.ClampToEdgeWrapping;

function makeEnvTexture(night = false) {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, h);
  if (!night) {
    g.addColorStop(0, '#3d658c');
    g.addColorStop(0.3, '#7e9cb4');
    g.addColorStop(0.47, '#e7b795');
    g.addColorStop(0.53, '#c79c7b');
    g.addColorStop(0.72, '#6f6751');
    g.addColorStop(1, '#3c3b30');
  } else {
    g.addColorStop(0, '#02050c');
    g.addColorStop(0.42, '#0c1929');
    g.addColorStop(0.5, '#1b3044');
    g.addColorStop(0.6, '#121a20');
    g.addColorStop(1, '#05080b');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  if (!night) {
    const sx = w * 0.61;
    const sy = h * 0.32;
    const sun = ctx.createRadialGradient(sx, sy, 2, sx, sy, w * 0.23);
    sun.addColorStop(0, 'rgba(255,248,220,1)');
    sun.addColorStop(0.06, 'rgba(255,227,168,.92)');
    sun.addColorStop(0.22, 'rgba(255,190,118,.36)');
    sun.addColorStop(0.58, 'rgba(240,160,95,.08)');
    sun.addColorStop(1, 'rgba(240,160,95,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 12; i++) {
      const yy = h * (0.14 + Math.random() * 0.28);
      ctx.fillStyle = i % 2 ? '#f9d9bd' : '#ffe7cd';
      ctx.beginPath();
      ctx.ellipse(Math.random() * w, yy, 90 + Math.random() * 160, 7 + Math.random() * 12, 0, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    const sx = w * 0.1;
    const sy = h * 0.23;
    const moon = ctx.createRadialGradient(sx, sy, 1, sx, sy, w * 0.1);
    moon.addColorStop(0, 'rgba(226,240,255,1)');
    moon.addColorStop(0.06, 'rgba(190,214,255,.8)');
    moon.addColorStop(0.3, 'rgba(110,145,210,.15)');
    moon.addColorStop(1, 'rgba(60,90,160,0)');
    ctx.fillStyle = moon;
    ctx.fillRect(0, 0, w, h);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.needsUpdate = true;
  return tex;
}

/* ------------------------------------------------------------
   Materials
------------------------------------------------------------ */
const M = {
  plaster: new THREE.MeshStandardMaterial({ color: 0xf1ebe1, roughness: 0.88, metalness: 0 }),
  plasterShade: new THREE.MeshStandardMaterial({ color: 0xd9d0c2, roughness: 0.92 }),
  stone: new THREE.MeshStandardMaterial({ map: stoneTex, color: 0xddd4c4, roughness: 0.82 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0xb8b0a3, roughness: 0.9 }),
  gravel: new THREE.MeshStandardMaterial({ map: gravelTex, color: 0xc5b9a5, roughness: 1 }),
  darkStone: new THREE.MeshStandardMaterial({ color: 0x57534c, roughness: 0.78 }),
  deck: new THREE.MeshStandardMaterial({ map: deckTex, color: 0xffffff, roughness: 0.66 }),
  wood: new THREE.MeshStandardMaterial({ map: woodTex, color: 0xd6a276, roughness: 0.58 }),
  woodDark: new THREE.MeshStandardMaterial({ map: woodTex, color: 0x81573c, roughness: 0.7 }),
  blackMetal: new THREE.MeshStandardMaterial({ color: 0x17191a, roughness: 0.36, metalness: 0.72 }),
  bronze: new THREE.MeshStandardMaterial({ color: 0x6f5940, roughness: 0.36, metalness: 0.72 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x8fb2b5,
    metalness: 0.02,
    roughness: 0.045,
    transparent: true,
    opacity: 0.175,
    envMapIntensity: 1.9,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  glassRail: new THREE.MeshPhysicalMaterial({
    color: 0x9bb6b6,
    metalness: 0.05,
    roughness: 0.06,
    transparent: true,
    opacity: 0.2,
    envMapIntensity: 1.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  darkGlass: new THREE.MeshPhysicalMaterial({
    color: 0x0c1415,
    metalness: 0.82,
    roughness: 0.07,
    envMapIntensity: 2.2,
  }),
  interiorWall: new THREE.MeshStandardMaterial({ color: 0xd8c2a6, roughness: 0.9 }),
  interiorWarm: new THREE.MeshStandardMaterial({ color: 0xc8a77f, roughness: 0.85 }),
  floorWood: new THREE.MeshStandardMaterial({ map: woodTex, color: 0xc5a177, roughness: 0.56 }),
  rug: new THREE.MeshStandardMaterial({ color: 0xcfc2ac, roughness: 1 }),
  sofa: new THREE.MeshStandardMaterial({ color: 0xd6cdbd, roughness: 0.96 }),
  cushion: new THREE.MeshStandardMaterial({ color: 0xb7a78f, roughness: 0.98 }),
  teak: new THREE.MeshStandardMaterial({ map: woodTex, color: 0x9a7656, roughness: 0.66 }),
  linen: new THREE.MeshStandardMaterial({ color: 0xd7c9b2, roughness: 1 }),
  rust: new THREE.MeshStandardMaterial({ color: 0x9d5539, roughness: 0.75 }),
  cream: new THREE.MeshStandardMaterial({ color: 0xe3d8c5, roughness: 0.9 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }),
  leafDark: new THREE.MeshStandardMaterial({ color: 0x3f5135, roughness: 0.9, flatShading: true }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x695341, roughness: 0.98, flatShading: true }),
  grass: new THREE.MeshStandardMaterial({ map: grassTex, color: 0xc6d6a6, roughness: 1 }),
  poolTile: new THREE.MeshStandardMaterial({
    map: poolFloorTex,
    color: 0xc6e3e0,
    roughness: 0.42,
    metalness: 0.05,
  }),
  poolCoping: new THREE.MeshStandardMaterial({ color: 0xc2b39e, roughness: 0.72 }),
  poolDark: new THREE.MeshStandardMaterial({ color: 0x143f49, roughness: 0.5 }),
  ceramic: new THREE.MeshStandardMaterial({ color: 0xcac0ae, roughness: 0.7 }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0x4b3729, roughness: 0.55 }),
  whiteFabric: new THREE.MeshStandardMaterial({ color: 0xded3c1, roughness: 1 }),
};

/* ------------------------------------------------------------
   Small builders
------------------------------------------------------------ */
function addBox(w, h, d, mat, x, y, z, opts = {}) {
  const {
    parent = scene,
    r = 0,
    ry = 0,
    rx = 0,
    rz = 0,
    cast = true,
    receive = true,
    name = '',
  } = opts;
  const geo = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  if (name) mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function addPlane(w, h, mat, x, y, z, rx = 0, ry = 0, rz = 0, parent = scene, receive = true) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}

function addCylinder(rTop, rBottom, h, mat, x, y, z, segments = 16, parent = scene, cast = true) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function glowSprite(color, scale, opacity, x, y, z, parent = scene) {
  const mat = new THREE.SpriteMaterial({
    map: glowTex,
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(scale, scale, 1);
  s.position.set(x, y, z);
  parent.add(s);
  return { sprite: s, mat, baseOpacity: opacity };
}

function windowFrame(w, h, x, y, z, mat, parent, t = 0.055, depth = 0.09) {
  addBox(w, t, depth, mat, x, y + h / 2, z, { parent, r: 0 });
  addBox(w, t, depth, mat, x, y - h / 2, z, { parent, r: 0 });
  addBox(t, h, depth, mat, x - w / 2, y, z, { parent, r: 0 });
  addBox(t, h, depth, mat, x + w / 2, y, z, { parent, r: 0 });
}

function tube(a, b, r1, r2, mat, parent) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(r2, r1, len, 6, 1);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// collections populated while the scene is built, then driven by the light mixer
const eaveGlowMats = [];
const pendantGlows = [];
const pathGlows = [];

/* ------------------------------------------------------------
   Sky, stars, distant ridges
------------------------------------------------------------ */
const skyUniforms = {
  uTop: { value: new THREE.Color('#3f6b94') },
  uMid: { value: new THREE.Color('#9c8794') },
  uHorizon: { value: new THREE.Color('#f2b286') },
  uBottom: { value: new THREE.Color('#5d5244') },
  uHaze: { value: new THREE.Color('#ffd0a1') },
  uSunColor: { value: new THREE.Color('#ffd39a') },
  uSunDir: { value: new THREE.Vector3(0.62, 0.4, 0.55).normalize() },
  uSunStrength: { value: 1.7 },
};

const skyMat = new THREE.ShaderMaterial({
  uniforms: skyUniforms,
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec3 vDir;
    uniform vec3 uTop, uMid, uHorizon, uBottom, uHaze, uSunColor, uSunDir;
    uniform float uSunStrength;
    void main() {
      vec3 d = normalize(vDir);
      float y = d.y;

      vec3 col = mix(uHorizon, uMid, smoothstep(-0.015, 0.045, y));
      col = mix(col, uTop, smoothstep(0.028, 0.17, y));
      col = mix(uBottom, col, smoothstep(-0.24, 0.012, y));

      float s = max(dot(d, normalize(uSunDir)), 0.0);
      float broad = pow(s, 3.0) * 0.13;
      float glow = pow(s, 20.0) * 0.42;
      float disc = smoothstep(0.99945, 0.99985, s) * 2.6;
      col += uSunColor * (broad + glow + disc) * uSunStrength;

      col += uHaze * exp(-max(y, 0.0) * 22.0) * 0.09;
      col += uHaze * pow(max(1.0 - abs(y), 0.0), 18.0) * 0.04;

      float cloudBand = smoothstep(0.012, 0.05, y) * (1.0 - smoothstep(0.10, 0.19, y));
      float wisps = sin(d.x * 7.0 + d.z * 3.0 + 1.3) * 0.55
                  + sin(d.x * 13.0 - d.z * 8.0 + 2.7) * 0.3
                  + sin(d.x * 3.0 + d.z * 11.0 - 0.8) * 0.15;
      col += uHaze * cloudBand * smoothstep(0.38, 0.92, wisps) * 0.055;

      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 28), skyMat);
sky.renderOrder = -1000;
scene.add(sky);

// stars
const starCount = 1100;
const starPos = new Float32Array(starCount * 3);
const starR = rng(133);
for (let i = 0; i < starCount; i++) {
  const u = starR() * 2 - 1;
  const phi = starR() * Math.PI * 2;
  const y = 0.06 + Math.pow(starR(), 0.65) * 0.94;
  const rad = Math.sqrt(1 - y * y);
  const r = 830;
  starPos[i * 3] = Math.cos(phi) * rad * r;
  starPos[i * 3 + 1] = y * r;
  starPos[i * 3 + 2] = Math.sin(phi) * rad * r;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({
  map: starTex,
  color: 0xdfeaff,
  size: 3.0,
  sizeAttenuation: false,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  fog: false,
  toneMapped: false,
});
const stars = new THREE.Points(starGeo, starMat);
stars.renderOrder = -900;
scene.add(stars);

// layered distant hills
const mountainLayers = [];
function addRidge(radius, minH, maxH, colorDay, colorNight, seed, segments = 220) {
  const positions = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const p1 = Math.pow(Math.abs(Math.sin(a * 2.7 + seed * 0.8)), 0.7);
    const p2 = Math.pow(Math.abs(Math.sin(a * 6.6 + seed * 2.1)), 0.85);
    const p3 = Math.pow(Math.abs(Math.sin(a * 14.3 + seed * 3.7)), 1.05);
    const shape = 0.16 + 0.54 * p1 + 0.22 * p2 + 0.08 * p3;
    const h = minH + (maxH - minH) * shape;
    const rr = radius * (1 + 0.018 * Math.sin(a * 5 + seed));
    positions.push(Math.cos(a) * rr, -10, Math.sin(a) * rr);
    positions.push(Math.cos(a) * rr, h, Math.sin(a) * rr);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = ((i + 1) % segments) * 2;
    const d = c + 1;
    indices.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(colorDay),
    side: THREE.DoubleSide,
    fog: true,
    toneMapped: true,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.renderOrder = -800;
  scene.add(mesh);
  mountainLayers.push({
    mat,
    day: new THREE.Color(colorDay),
    night: new THREE.Color(colorNight),
  });
}
addRidge(540, 12, 26, '#68716c', '#0c1620', 2.1);
addRidge(450, 8, 19, '#4d5b52', '#09121a', 5.8);
addRidge(360, 4, 12, '#34493b', '#060d13', 8.4);

/* ------------------------------------------------------------
   Ground & hardscape
------------------------------------------------------------ */
const ground = addPlane(
  1100,
  1100,
  M.grass,
  0,
  -0.02,
  0,
  -Math.PI / 2,
  0,
  0,
  scene,
  true
);
ground.name = 'lawn';

// gravel apron around the house
addBox(23, 0.05, 17, M.gravel, 0, 0.01, -2.2, { receive: true, cast: false, r: 0 });

// deck built around a pool cut-out
const deckGroup = new THREE.Group();
deckGroup.name = 'deck';
scene.add(deckGroup);
const deckTop = 0.34;
const deckY = 0.2;
[
  [0, 7.55, 16.8, 2.1], // front
  [0, 2.45, 16.8, 2.1], // rear
  [-4.4, 5.15, 8.0, 3.3], // left
  [7.1, 5.15, 2.6, 3.3], // right
].forEach(([x, z, w, d]) => {
  addBox(w, 0.28, d, M.deck, x, deckY, z, { parent: deckGroup, r: 0.02 });
});

// slim dark edge of deck
addBox(16.9, 0.1, 0.08, M.blackMetal, 0, 0.27, 8.61, { parent: deckGroup, cast: false });
addBox(0.08, 0.1, 7.18, M.blackMetal, -8.41, 0.27, 5.03, { parent: deckGroup, cast: false });
addBox(0.08, 0.1, 7.18, M.blackMetal, 8.41, 0.27, 5.03, { parent: deckGroup, cast: false });

// stone steps from lawn to deck
addBox(2.8, 0.18, 0.55, M.stone, -6.8, 0.105, 8.88, { parent: deckGroup, r: 0.02 });
addBox(2.8, 0.1, 0.5, M.stone, -6.8, 0.04, 9.36, { parent: deckGroup, r: 0.02 });

// pool basin
const poolGroup = new THREE.Group();
poolGroup.name = 'pool';
scene.add(poolGroup);
addBox(6.4, 0.1, 3.5, M.poolDark, 2.7, 0.04, 5.2, { parent: poolGroup, cast: false });
addPlane(6.1, 3.2, M.poolTile, 2.7, 0.1, 5.2, -Math.PI / 2, 0, 0, poolGroup, false);
addBox(0.1, 0.32, 3.4, M.poolTile, -0.39, 0.21, 5.2, { parent: poolGroup, cast: false });
addBox(0.1, 0.32, 3.4, M.poolTile, 5.79, 0.21, 5.2, { parent: poolGroup, cast: false });
addBox(6.2, 0.32, 0.1, M.poolTile, 2.7, 0.21, 3.56, { parent: poolGroup, cast: false });
addBox(6.2, 0.32, 0.1, M.poolTile, 2.7, 0.21, 6.84, { parent: poolGroup, cast: false });
// coping
addBox(6.9, 0.13, 0.34, M.poolCoping, 2.7, 0.375, 3.44, { parent: poolGroup, r: 0.025 });
addBox(6.9, 0.13, 0.34, M.poolCoping, 2.7, 0.375, 6.96, { parent: poolGroup, r: 0.025 });
addBox(0.34, 0.13, 3.3, M.poolCoping, -0.58, 0.375, 5.2, { parent: poolGroup, r: 0.025 });
addBox(0.34, 0.13, 3.3, M.poolCoping, 5.98, 0.375, 5.2, { parent: poolGroup, r: 0.025 });

// water
const waterUniforms = {
  uTime: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0.62, 0.4, 0.55).normalize() },
  uSunColor: { value: new THREE.Color('#ffd2a0') },
  uNight: { value: 0 },
};
const waterMat = new THREE.ShaderMaterial({
  uniforms: waterUniforms,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  vertexShader: /* glsl */ `
    uniform float uTime;
    varying vec3 vWorld;
    varying vec2 vUv;
    void main() {
      vec3 p = position;
      float wave = sin(p.x * 2.6 + uTime * 1.1) * 0.012
                 + sin(p.y * 3.1 - uTime * 0.8) * 0.009
                 + sin((p.x + p.y) * 4.2 + uTime * 0.55) * 0.006;
      p.z += wave;
      vWorld = (modelMatrix * vec4(p, 1.0)).xyz;
      vUv = uv;
      gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    uniform float uNight;
    varying vec3 vWorld;
    varying vec2 vUv;
    void main() {
      vec2 p = vWorld.xz;
      vec3 n = normalize(vec3(
        -0.05 * cos(p.x * 3.2 + uTime * 0.9) - 0.03 * cos((p.x + p.y) * 4.0 + uTime * 0.6),
        1.0,
        -0.05 * cos(p.y * 2.7 - uTime * 0.7) - 0.03 * cos((p.x - p.y) * 3.6 + uTime * 0.4)
      ));
      vec3 V = normalize(cameraPosition - vWorld);
      float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);

      vec3 deep = vec3(0.012, 0.065, 0.085);
      vec3 shallow = vec3(0.04, 0.19, 0.215);
      vec3 daySky = mix(vec3(0.16, 0.27, 0.33), vec3(0.56, 0.63, 0.68), clamp(n.x * 0.25 + 0.5, 0.0, 1.0));
      vec3 nightSky = vec3(0.012, 0.038, 0.062);
      vec3 skyCol = mix(daySky, nightSky, uNight);
      vec3 col = mix(deep, shallow, 0.55 + 0.18 * sin(p.x * 1.4 + p.y * 1.1));
      col *= mix(1.0, 0.2, uNight);
      col = mix(col, skyCol, 0.14 + fres * 0.62);
      col += uSunColor * fres * 0.08 * (1.0 - 0.65 * uNight);

      vec3 R = reflect(-normalize(uSunDir), n);
      float spec = pow(max(dot(R, V), 0.0), 300.0);
      float broad = pow(max(dot(R, V), 0.0), 18.0);
      col += uSunColor * spec * 2.0 * (1.0 - 0.75 * uNight);
      col += uSunColor * broad * 0.22 * (1.0 - 0.6 * uNight);

      float flow = sin(p.x * 2.4 + uTime * 0.55) * sin(p.y * 3.7 - uTime * 0.7);
      col += vec3(0.16, 0.42, 0.44) * (flow * 0.5 + 0.5) * 0.035;

      float lampGlow = exp(-length(p - vec2(0.55, 6.45)) * 1.35)
                     + exp(-length(p - vec2(4.85, 6.45)) * 1.35);
      col += vec3(0.04, 0.34, 0.38) * lampGlow * uNight * 0.2;
      gl_FragColor = vec4(col, mix(0.96, 0.42, uNight));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
});
const water = new THREE.Mesh(new THREE.PlaneGeometry(6.1, 3.2, 56, 32), waterMat);
water.rotation.x = -Math.PI / 2;
water.position.set(2.7, 0.275, 5.2);
water.renderOrder = 2;
water.receiveShadow = false;
poolGroup.add(water);

// underwater lights
const poolGlowMats = [];
for (const x of [0.55, 4.85]) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0a1f22,
    emissive: new THREE.Color(0x63e4ef),
    emissiveIntensity: 0.1,
    roughness: 0.3,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.095, 20), mat);
  disc.position.set(x, 0.19, 6.79);
  poolGroup.add(disc);
  poolGlowMats.push({ mat, day: 0.12, night: 1.1 });
}
const poolPoint = new THREE.PointLight(0x63d6df, 0, 6.5, 2);
poolPoint.position.set(2.7, 0.42, 5.2);
scene.add(poolPoint);

/* ------------------------------------------------------------
   Ground floor shell
------------------------------------------------------------ */
const house = new THREE.Group();
house.name = 'house';
scene.add(house);

const FLOOR_Y = 0.4;
const LOWER_TOP = 3.78;
const UPPER_BASE = 3.84;
const UPPER_TOP = 7.02;
const ROOF_Y = 7.17;

// foundation slab
addBox(12.65, 0.26, 7.75, M.darkStone, 0, 0.29, -2.15, { parent: house, r: 0.025 });
addPlane(12.2, 7.3, M.floorWood, 0, 0.425, -2.15, -Math.PI / 2, 0, 0, house, true);

// solid back + left walls
addBox(12.4, 3.4, 0.3, M.plaster, 0, 2.09, -5.79, { parent: house, r: 0.035 });
addBox(0.3, 3.4, 7.2, M.plaster, -6.08, 2.09, -2.19, { parent: house, r: 0.035 });
// warm inner linings
addPlane(11.9, 3.2, M.interiorWall, 0, 2.05, -5.62, 0, 0, 0, house, true);
addPlane(7.0, 3.2, M.interiorWall, -5.91, 2.05, -2.2, 0, Math.PI / 2, 0, house, true);

// front glass curtain wall
const frontGlass = addPlane(9.35, 3.2, M.glass, -1.28, 2.02, 1.37, 0, 0, 0, house, false);
frontGlass.renderOrder = 4;
windowFrame(9.35, 3.2, -1.28, 2.02, 1.42, M.blackMetal, house, 0.075, 0.1);
for (const x of [-4.4, -1.27, 1.85]) {
  addBox(0.055, 3.2, 0.1, M.blackMetal, x, 2.02, 1.42, { parent: house });
}
addBox(9.45, 0.11, 0.24, M.blackMetal, -1.28, 3.67, 1.42, { parent: house });
addBox(9.45, 0.16, 0.26, M.darkStone, -1.28, 0.44, 1.42, { parent: house });

// right glass corner
const sideGlass = addPlane(5.5, 3.2, M.glass, 6.08, 2.02, -1.75, 0, Math.PI / 2, 0, house, false);
sideGlass.renderOrder = 4;
addBox(0.09, 3.2, 0.075, M.blackMetal, 6.1, 2.02, -4.48, { parent: house });
addBox(0.09, 3.2, 0.075, M.blackMetal, 6.1, 2.02, 0.98, { parent: house });
addBox(0.24, 0.11, 5.5, M.blackMetal, 6.1, 3.67, -1.75, { parent: house });

// timber entry volume on the right of the facade
addBox(2.9, 3.42, 0.34, M.woodDark, 4.7, 2.08, 1.37, { parent: house, r: 0.02 });
addBox(2.7, 3.2, 0.26, M.wood, 4.7, 2.02, 1.52, { parent: house, r: 0.01 });
// door
addBox(1.05, 2.58, 0.1, M.darkWood, 4.55, 1.72, 1.67, { parent: house, r: 0.012 });
addBox(0.035, 0.52, 0.045, M.bronze, 4.98, 1.75, 1.735, { parent: house });
addBox(0.58, 0.035, 0.045, M.bronze, 4.76, 1.75, 1.735, { parent: house });
// sidelight
addBox(0.5, 2.58, 0.055, M.darkGlass, 5.55, 1.72, 1.69, { parent: house, cast: false });
addBox(0.04, 2.62, 0.09, M.blackMetal, 5.29, 1.72, 1.69, { parent: house });
addBox(0.04, 2.62, 0.09, M.blackMetal, 5.81, 1.72, 1.69, { parent: house });

// vertical timber fins over entry
for (let i = 0; i < 17; i++) {
  const x = 3.46 + i * 0.165;
  addBox(0.052, 3.35, 0.12, M.wood, x, 2.1, 1.72, { parent: house, cast: true });
}
addBox(2.95, 0.055, 0.15, M.blackMetal, 4.72, 3.63, 1.7, { parent: house });
addBox(2.95, 0.055, 0.15, M.blackMetal, 4.72, 0.46, 1.7, { parent: house });

// address plaque
const addressMat = new THREE.MeshStandardMaterial({
  map: addressTex,
  roughness: 0.6,
  emissive: new THREE.Color(0xffffff),
  emissiveMap: addressTex,
  emissiveIntensity: 0.06,
});
const address = addPlane(0.62, 0.62, addressMat, 3.36, 2.42, 1.79, 0, 0, 0, house, false);
eaveGlowMats.push({ mat: addressMat, day: 0.06, night: 0.7 });

// ceiling slab / upper floor plate
addBox(12.8, 0.2, 7.9, M.plaster, 0, 3.73, -2.16, { parent: house, r: 0.045 });
addBox(12.9, 0.1, 0.1, M.blackMetal, 0, 3.64, 1.53, { parent: house, cast: false });
// interior ceiling plane
addPlane(11.9, 7.2, M.interiorWall, 0, 3.615, -2.19, Math.PI / 2, 0, 0, house, true);

// entry step
addBox(3.0, 0.12, 0.75, M.stone, 4.65, 0.34, 1.95, { parent: house, r: 0.02 });

/* ------------------------------------------------------------
   Upper volume
------------------------------------------------------------ */
const upper = new THREE.Group();
upper.name = 'upper-floor';
house.add(upper);

addBox(9.0, 3.2, 6.72, M.plaster, -1.55, 5.42, -2.43, { parent: upper, r: 0.055 });

// dark window band, front
const upperGlass = M.darkGlass.clone();
upperGlass.transparent = true;
upperGlass.opacity = 0.62;
upperGlass.depthWrite = false;
const upperWindow = addPlane(5.85, 2.03, upperGlass, -2.5, 5.56, 0.965, 0, 0, 0, upper, false);
upperWindow.renderOrder = 3;
windowFrame(5.85, 2.03, -2.5, 5.56, 0.985, M.blackMetal, upper, 0.06, 0.075);
for (const x of [-4.05, -1.0]) {
  addBox(0.045, 2.03, 0.08, M.blackMetal, x, 5.56, 0.985, { parent: upper });
}
// warm bedroom interior painted onto a luminous plane behind the glazing
const upperInnerMat = new THREE.MeshStandardMaterial({
  map: upperRoomTex,
  color: 0x6b4b34,
  emissive: new THREE.Color(0xffb273),
  emissiveMap: upperRoomTex,
  emissiveIntensity: 0.07,
  roughness: 0.92,
});
addPlane(5.75, 1.95, upperInnerMat, -2.5, 5.56, 0.948, 0, 0, 0, upper, false);

// vertical timber screen right of window
for (let i = 0; i < 15; i++) {
  const x = 0.3 + i * 0.146;
  addBox(0.052, 2.78, 0.13, M.wood, x, 5.47, 0.99, { parent: upper });
}
addBox(2.2, 0.07, 0.15, M.blackMetal, 1.32, 4.11, 0.95, { parent: upper });
addBox(2.2, 0.07, 0.15, M.blackMetal, 1.32, 6.82, 0.95, { parent: upper });

// side window on the west
const westWin = addPlane(2.1, 1.5, M.darkGlass, -6.06, 5.45, -2.7, 0, -Math.PI / 2, 0, upper, false);
for (const dz of [-3.75, -1.65]) {
  addBox(0.075, 1.62, 0.07, M.blackMetal, -6.07, 5.45, dz, { parent: upper });
}
for (const y of [4.7, 6.2]) {
  addBox(0.075, 0.07, 2.2, M.blackMetal, -6.07, y, -2.7, { parent: upper });
}

// glazed door from the upper hall onto the terrace
const terraceDoor = addPlane(1.28, 2.42, M.darkGlass, 2.958, 5.06, -3.32, 0, Math.PI / 2, 0, upper, false);
terraceDoor.renderOrder = 3;
for (const z of [-3.98, -2.66]) {
  addBox(0.075, 2.48, 0.06, M.blackMetal, 2.975, 5.06, z, { parent: upper });
}
for (const y of [3.82, 6.28]) {
  addBox(0.075, 0.06, 1.4, M.blackMetal, 2.975, y, -3.32, { parent: upper });
}
addBox(0.055, 0.34, 0.035, M.bronze, 2.995, 4.72, -2.78, { parent: upper });
// small terrace sconce
const terraceSconceMat = new THREE.MeshStandardMaterial({
  color: 0x241a11,
  emissive: new THREE.Color(0xffc080),
  emissiveIntensity: 0.4,
  roughness: 0.5,
});
addBox(0.04, 0.38, 0.045, terraceSconceMat, 2.985, 5.02, -2.42, { parent: upper, cast: false });
eaveGlowMats.push({ mat: terraceSconceMat, day: 0.4, night: 2.1 });

// upper terrace floor
addBox(3.55, 0.16, 7.0, M.stone, 4.4, 3.82, -2.35, { parent: upper, r: 0.02 });
addPlane(3.25, 6.9, M.deck, 4.4, 3.91, -2.35, -Math.PI / 2, 0, 0, upper, true);

// glass balustrade along terrace edge
addPlane(3.35, 0.92, M.glassRail, 4.43, 4.46, 1.22, 0, 0, 0, upper, false).renderOrder = 4;
addPlane(0.92, 6.9, M.glassRail, 6.1, 4.46, -2.35, 0, Math.PI / 2, 0, upper, false).renderOrder = 4;
addBox(3.5, 0.055, 0.065, M.blackMetal, 4.43, 4.94, 1.23, { parent: upper, cast: false });
addBox(0.065, 0.055, 6.95, M.blackMetal, 6.11, 4.94, -2.35, { parent: upper, cast: false });
for (const x of [2.78, 4.4, 6.1]) {
  addBox(0.045, 0.95, 0.05, M.blackMetal, x, 4.46, 1.23, { parent: upper, cast: false });
}
for (const z of [-5.78, -4.0, -2.2, -0.4, 1.22]) {
  addBox(0.045, 0.95, 0.05, M.blackMetal, 6.11, 4.46, z, { parent: upper, cast: false });
}

// pergola over the upper terrace
for (const z of [-1.15, 0.95]) {
  for (const x of [3.05, 5.95]) {
    addBox(0.11, 2.45, 0.11, M.blackMetal, x, 5.2, z, { parent: upper });
  }
}
for (const z of [-1.16, 0.96]) {
  addBox(3.2, 0.14, 0.15, M.wood, 4.5, 6.42, z, { parent: upper });
}
for (let i = 0; i < 15; i++) {
  const z = -1.18 + i * 0.15;
  addBox(3.1, 0.055, 0.07, M.wood, 4.5, 6.52, z, { parent: upper, cast: true });
}
// terrace furniture silhouettes
addBox(1.3, 0.16, 0.65, M.teak, 3.9, 4.22, -0.55, { parent: upper, r: 0.04 });
addBox(1.1, 0.12, 0.55, M.linen, 3.9, 4.32, -0.55, { parent: upper, r: 0.04 });
addCylinder(0.28, 0.32, 0.38, M.ceramic, 5.35, 4.1, -0.25, 16, upper);
addCylinder(0.33, 0.33, 0.03, M.darkWood, 5.35, 4.3, -0.25, 16, upper);
// terrace planter
addBox(0.62, 0.58, 0.62, M.ceramic, 5.45, 4.2, 0.72, { parent: upper, r: 0.03 });
// low daybed against the upper wall
addBox(2.35, 0.28, 1.05, M.teak, 4.25, 4.06, -4.55, { parent: upper, r: 0.04 });
addBox(2.2, 0.15, 0.92, M.linen, 4.25, 4.24, -4.55, { parent: upper, r: 0.05 });
addBox(0.6, 0.22, 0.38, M.whiteFabric, 3.65, 4.33, -4.8, { parent: upper, r: 0.05 });
addBox(0.45, 0.22, 0.34, M.cushion, 4.7, 4.33, -4.8, { parent: upper, r: 0.05 });
// potted olive on the terrace
addCylinder(0.26, 0.32, 0.55, M.ceramic, 5.5, 4.15, -4.92, 20, upper);
addCylinder(0.04, 0.06, 1.25, M.trunk, 5.5, 4.95, -4.92, 6, upper);
for (let i = 0; i < 7; i++) {
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.26, 6, 5), M.leafDark);
  leaf.position.set(5.5 + (Math.random() - 0.5) * 0.8, 5.4 + Math.random() * 0.7, -4.92 + (Math.random() - 0.5) * 0.7);
  leaf.scale.set(0.8, 0.5, 0.8);
  leaf.castShadow = true;
  upper.add(leaf);
}

/* ------------------------------------------------------------
   Roof
------------------------------------------------------------ */
addBox(14.1, 0.24, 8.55, M.plaster, -0.22, ROOF_Y, -2.08, { parent: house, r: 0.05 });
// fascia
addBox(14.2, 0.16, 0.1, M.darkStone, -0.22, 7.05, 2.24, { parent: house, cast: false });
addBox(0.1, 0.16, 8.6, M.darkStone, -7.32, 7.05, -2.08, { parent: house, cast: false });
addBox(0.1, 0.16, 8.6, M.darkStone, 6.88, 7.05, -2.08, { parent: house, cast: false });
addBox(14.2, 0.16, 0.1, M.darkStone, -0.22, 7.05, -6.4, { parent: house, cast: false });
// warm timber soffit on the overhang
addPlane(13.4, 1.12, M.wood, -0.22, 7.025, 1.72, Math.PI / 2, 0, 0, house, false);
// recessed lights under the eave
const eaveGlowMat = new THREE.MeshStandardMaterial({
  color: 0x1d1711,
  emissive: new THREE.Color(0xffc27c),
  emissiveIntensity: 1.2,
  roughness: 0.4,
});
const eaveLights = [
  [-4.7, 1.64],
  [-1.5, 1.64],
  [1.7, 1.64],
  [4.7, 1.64],
];
for (const [x, z] of eaveLights) {
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.03, 16), eaveGlowMat);
  disc.position.set(x, 7.01, z);
  house.add(disc);
  glowSprite(0xffc17d, 0.8, 0.1, x, 6.98, z, house);
}
const eaveGlows = house.children
  .filter((o) => o.isSprite)
  .map((s) => ({ sprite: s, mat: s.material, baseOpacity: 0.1 }));

/* ------------------------------------------------------------
   Interior
------------------------------------------------------------ */
const interior = new THREE.Group();
interior.name = 'interior';
house.add(interior);
const interiorLights = [];

function addPointLight(color, intensity, distance, decay, x, y, z, parent = scene) {
  const light = new THREE.PointLight(color, intensity, distance, decay);
  light.position.set(x, y, z);
  parent.add(light);
  return light;
}

const livingLight = addPointLight(0xffb573, 7, 11, 2, -0.8, 2.62, -1.6, interior);
const diningLight = addPointLight(0xffbd7f, 5.5, 9, 2, 3.9, 2.55, -2.9, interior);
interiorLights.push({ light: livingLight, day: 13.5, night: 12.5 });
interiorLights.push({ light: diningLight, day: 9.5, night: 9.0 });

// rug
addBox(4.9, 0.025, 3.3, M.rug, -0.9, 0.42, -1.55, { parent: interior, cast: false });

// sofa
const sofa = new THREE.Group();
sofa.position.set(-0.8, 0.42, -2.95);
interior.add(sofa);
addBox(4.3, 0.36, 1.3, M.sofa, 0, 0.18, 0, { parent: sofa, r: 0.075 });
addBox(4.1, 0.2, 1.15, M.cushion, 0, 0.43, 0.06, { parent: sofa, r: 0.06 });
addBox(4.3, 0.85, 0.24, M.sofa, 0, 0.63, -0.55, { parent: sofa, r: 0.07 });
addBox(0.26, 0.64, 1.26, M.sofa, -2.02, 0.46, 0, { parent: sofa, r: 0.06 });
addBox(0.26, 0.64, 1.26, M.sofa, 2.02, 0.46, 0, { parent: sofa, r: 0.06 });
for (const x of [-1.34, -0.44, 0.46, 1.34]) {
  addBox(0.82, 0.55, 0.16, M.cushion, x, 0.78, -0.4, { parent: sofa, r: 0.06, rx: -0.12 });
}
for (const x of [-1.75, 1.75]) {
  addBox(0.42, 0.42, 0.13, M.linen, x, 0.67, -0.25, { parent: sofa, r: 0.06, rz: x > 0 ? -0.14 : 0.14 });
}

// coffee table
addBox(2.25, 0.075, 1.02, M.darkWood, -0.8, 0.78, -0.83, { parent: interior, r: 0.02 });
addBox(0.09, 0.36, 0.09, M.blackMetal, -1.75, 0.58, -1.2, { parent: interior });
addBox(0.09, 0.36, 0.09, M.blackMetal, 0.15, 0.58, -1.2, { parent: interior });
addBox(0.09, 0.36, 0.09, M.blackMetal, -1.75, 0.58, -0.48, { parent: interior });
addBox(0.09, 0.36, 0.09, M.blackMetal, 0.15, 0.58, -0.48, { parent: interior });
// table objects
addCylinder(0.16, 0.2, 0.18, M.ceramic, -1.3, 0.91, -0.9, 20, interior);
addCylinder(0.21, 0.23, 0.04, M.darkWood, -1.3, 1.01, -0.9, 20, interior);
const book1 = addBox(0.48, 0.045, 0.32, M.rust, -0.15, 0.86, -0.82, { parent: interior, cast: false });
book1.rotation.y = 0.25;
addBox(0.4, 0.04, 0.28, M.cream, -0.1, 0.9, -0.84, { parent: interior, cast: false });

// armchair
const chair = new THREE.Group();
chair.position.set(-3.1, 0.42, -0.45);
chair.rotation.y = 0.9;
interior.add(chair);
addBox(1.05, 0.3, 0.95, M.cushion, 0, 0.25, 0, { parent: chair, r: 0.08 });
addBox(1.05, 0.68, 0.16, M.cushion, 0, 0.62, -0.4, { parent: chair, r: 0.07 });
addBox(0.14, 0.48, 0.9, M.cushion, -0.46, 0.44, 0, { parent: chair, r: 0.06 });
addBox(0.14, 0.48, 0.9, M.cushion, 0.46, 0.44, 0, { parent: chair, r: 0.06 });
for (const x of [-0.4, 0.4]) for (const z of [-0.34, 0.34]) addBox(0.06, 0.2, 0.06, M.blackMetal, x, 0.1, z, { parent: chair });

// rug under lounge
addBox(4.2, 0.02, 3.1, M.rug, -0.8, 0.41, -1.55, { parent: interior, cast: false });

// artwork
addBox(3.2, 1.82, 0.055, M.blackMetal, -0.5, 2.35, -5.57, { parent: interior, cast: false });
addPlane(3.05, 1.66, new THREE.MeshStandardMaterial({ map: artTex, roughness: 0.85 }), -0.5, 2.35, -5.535, 0, 0, 0, interior, false);
// sculptural floor lamp
addCylinder(0.23, 0.27, 0.04, M.blackMetal, -4.15, 0.44, -3.35, 24, interior);
addCylinder(0.022, 0.022, 1.75, M.blackMetal, -4.15, 1.3, -3.35, 8, interior);
const lampShadeMat = new THREE.MeshStandardMaterial({
  color: 0x2b241d,
  emissive: new THREE.Color(0xffbd7e),
  emissiveIntensity: 1.4,
  roughness: 0.65,
  side: THREE.DoubleSide,
});
const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.36, 20, 1, true), lampShadeMat);
shade.position.set(-4.15, 2.22, -3.35);
interior.add(shade);
const lampGlow = glowSprite(0xffbf83, 1.7, 0.13, -4.15, 2.2, -3.35, interior);

// dining table and chairs
const dining = new THREE.Group();
dining.position.set(3.95, 0.42, -2.75);
interior.add(dining);
addBox(2.5, 0.075, 1.12, M.woodDark, 0, 0.76, 0, { parent: dining, r: 0.02 });
addBox(0.08, 0.72, 0.08, M.blackMetal, -1.02, 0.38, -0.35, { parent: dining });
addBox(0.08, 0.72, 0.08, M.blackMetal, 1.02, 0.38, -0.35, { parent: dining });
addBox(0.08, 0.72, 0.08, M.blackMetal, -1.02, 0.38, 0.35, { parent: dining });
addBox(0.08, 0.72, 0.08, M.blackMetal, 1.02, 0.38, 0.35, { parent: dining });
for (const x of [-0.72, 0, 0.72]) {
  for (const side of [-1, 1]) {
    const c = new THREE.Group();
    c.position.set(x, 0, side * 0.85);
    c.rotation.y = side > 0 ? Math.PI : 0;
    dining.add(c);
    addBox(0.48, 0.09, 0.48, M.teak, 0, 0.47, 0, { parent: c, r: 0.02 });
    addBox(0.48, 0.52, 0.08, M.teak, 0, 0.75, -0.2, { parent: c, r: 0.015 });
    for (const lx of [-0.19, 0.19]) {
      for (const lz of [-0.19, 0.19]) addBox(0.05, 0.47, 0.05, M.blackMetal, lx, 0.235, lz, { parent: c });
    }
  }
}
// pendants
for (const x of [3.3, 3.95, 4.6]) {
  addCylinder(0.006, 0.006, 0.95, M.blackMetal, x, 3.11, -2.75, 6, interior, false);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2b1d0f,
    emissive: new THREE.Color(0xffc482),
    emissiveIntensity: 1.8,
    roughness: 0.55,
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), mat);
  bulb.position.set(x, 2.58, -2.75);
  interior.add(bulb);
  const gl = glowSprite(0xffc485, 1.25, 0.18, x, 2.56, -2.75, interior);
  eaveGlowMats.push({ mat, day: 1.8, night: 3.8 });
  pendantGlows.push(gl);
}

// linear ceiling light slots
const ceilingStripMat = new THREE.MeshStandardMaterial({
  color: 0x1b1510,
  emissive: new THREE.Color(0xffd2a2),
  emissiveIntensity: 1.2,
  roughness: 0.55,
});
for (const z of [-3.72, -1.05]) {
  addBox(4.7, 0.025, 0.13, M.blackMetal, -0.3, 3.598, z, { parent: interior, cast: false });
  addBox(4.45, 0.012, 0.052, ceilingStripMat, -0.3, 3.583, z, { parent: interior, cast: false });
}
for (const x of [-3.25, -0.6, 2.05]) {
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.065, 0.025, 16), ceilingStripMat);
  disc.position.set(x, 3.598, -4.55);
  interior.add(disc);
}
eaveGlowMats.push({ mat: ceilingStripMat, day: 1.2, night: 2.4 });

// kitchen along the back, mostly read as warm cabinetry
addBox(3.9, 2.3, 0.58, M.woodDark, 2.55, 1.55, -5.23, { parent: interior });
addBox(3.95, 0.08, 0.66, M.stone, 2.55, 1.4, -5.2, { parent: interior });
addBox(2.2, 0.06, 0.5, M.blackMetal, 2.5, 2.72, -5.25, { parent: interior, cast: false });
for (const x of [1.5, 2.15, 2.8, 3.45]) {
  addBox(0.055, 0.7, 0.56, M.wood, x, 2.32, -5.15, { parent: interior, cast: false });
}
addPlane(3.8, 0.09, M.blackMetal, 2.55, 2.35, -4.94, 0, 0, 0, interior, false);

// cabinets/shelf with a few objects
addBox(2.0, 1.65, 0.4, M.woodDark, -4.75, 1.35, -5.3, { parent: interior });
for (let i = 0; i < 3; i++) {
  addBox(0.06, 0.5, 0.34, M.teak, -5.35 + i * 0.6, 1.85, -5.07, { parent: interior, cast: false });
}
// plant inside
addCylinder(0.3, 0.36, 0.58, M.ceramic, -5.1, 0.72, -0.55, 18, interior);
const indoorLeaves = new THREE.Group();
for (let i = 0; i < 9; i++) {
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 5), M.leafDark);
  leaf.position.set(-5.1 + (Math.random() - 0.5) * 0.8, 1.25 + Math.random() * 0.85, -0.55 + (Math.random() - 0.5) * 0.8);
  leaf.scale.set(0.8, 1.8, 0.45);
  leaf.rotation.z = Math.random() * 0.9 - 0.45;
  leaf.castShadow = true;
  indoorLeaves.add(leaf);
}
interior.add(indoorLeaves);

/* ------------------------------------------------------------
   Architectural details — outdoor lighting, planter
------------------------------------------------------------ */
// path lights
const pathPositions = [
  [-8.1, 9.1],
  [-9.2, 10.7],
  [-10.4, 12.2],
];
const pathGlowMats = [];
const pathLights = [];
for (const [x, z] of pathPositions) {
  addCylinder(0.055, 0.07, 0.58, M.blackMetal, x, 0.29, z, 12, scene);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x21180f,
    emissive: new THREE.Color(0xffbf75),
    emissiveIntensity: 0.25,
    roughness: 0.5,
  });
  addBox(0.16, 0.055, 0.16, mat, x, 0.6, z, { parent: scene, cast: false });
  pathGlowMats.push({ mat, day: 0.25, night: 3.2 });
  const pl = addPointLight(0xffb268, 0, 5.5, 2, x, 0.72, z);
  pathLights.push(pl);
  const gl = glowSprite(0xffb36b, 0.6, 0.02, x, 0.61, z);
  pathGlows.push(gl);
}

// stepping stones
const stoneSpots = [
  [-7.3, 9.8, 0.74], [-7.05, 10.8, 0.62], [-7.5, 11.8, 0.7],
  [-7.1, 12.9, 0.82], [-7.6, 14.0, 0.74], [-7.2, 15.1, 0.62],
];
for (const [x, z, s] of stoneSpots) {
  const st = addCylinder(s, s * 1.08, 0.08, M.stone, x, 0.045, z, 7, scene, false);
  st.rotation.y = Math.random() * Math.PI;
}

// large foundation planter, west side
addBox(3.2, 0.62, 1.0, M.ceramic, -6.9, 0.48, 2.25, { parent: scene, r: 0.04 });
addBox(3.0, 0.06, 0.82, M.darkStone, -6.9, 0.78, 2.25, { parent: scene, cast: false });

// warm up lights from the lawn
const treeSpot = new THREE.SpotLight(0xffc58b, 0, 12, 0.48, 0.85, 1.6);
treeSpot.position.set(-10.3, 0.2, -2.7);
treeSpot.target.position.set(-10.3, 6.2, -2.7);
scene.add(treeSpot);
scene.add(treeSpot.target);
const treeSpot2 = new THREE.SpotLight(0xffc58b, 0, 12, 0.5, 0.9, 1.6);
treeSpot2.position.set(9.4, 0.2, -3.8);
treeSpot2.target.position.set(9.4, 6.0, -3.8);
scene.add(treeSpot2);
scene.add(treeSpot2.target);

// entry wall light
const entryGlow = new THREE.MeshStandardMaterial({
  color: 0x1a1510,
  emissive: new THREE.Color(0xffc384),
  emissiveIntensity: 0.8,
  roughness: 0.5,
});
addBox(0.06, 0.62, 0.03, entryGlow, 4.03, 2.42, 1.78, { parent: house, cast: false });
const entryPoint = addPointLight(0xffbb79, 1.4, 7, 2, 4.0, 2.4, 2.15, house);
eaveGlowMats.push({ mat: entryGlow, day: 0.8, night: 2.6 });

/* define arrays referenced above (hoisted-safe) */

/* ------------------------------------------------------------
   Landscape
------------------------------------------------------------ */
const landscape = new THREE.Group();
landscape.name = 'landscape';
scene.add(landscape);

function leafClusterMesh(colors, count, spread, seed) {
  const geo = new THREE.IcosahedronGeometry(0.225, 1);
  const mat = M.leaf.clone();
  mat.color = new THREE.Color(0xffffff);
  const inst = new THREE.InstancedMesh(geo, mat, count);
  inst.castShadow = true;
  inst.receiveShadow = true;
  const r = rng(seed);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const theta = r() * Math.PI * 2;
    const rad = Math.pow(r(), 0.55) * spread;
    const phi = Math.acos(2 * r() - 1);
    const x = Math.cos(theta) * Math.sin(phi) * rad;
    const y = Math.cos(phi) * rad * 0.62;
    const z = Math.sin(theta) * Math.sin(phi) * rad;
    dummy.position.set(x, y, z);
    dummy.scale.set(0.65 + r() * 0.75, 0.4 + r() * 0.55, 0.65 + r() * 0.75);
    dummy.rotation.set(r() * 2, r() * 2, r() * 2);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
    color.set(colors[(r() * colors.length) | 0]);
    inst.setColorAt(i, color);
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.instanceColor.needsUpdate = true;
  return inst;
}

function makeOliveTree(x, z, scale = 1, seed = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  const r = rng(seed);
  const trunkBase = new THREE.Vector3(0, 0, 0);
  const mid = new THREE.Vector3(0.15 * (r() - 0.5), 1.45, 0.1 * (r() - 0.5));
  const top = new THREE.Vector3(0.28 * (r() - 0.5), 2.85, 0.2 * (r() - 0.5));
  tube(trunkBase, mid, 0.32, 0.2, M.trunk, g);
  tube(mid, top, 0.2, 0.13, M.trunk, g);
  const branches = [];
  for (let i = 0; i < 7; i++) {
    const start = new THREE.Vector3(
      top.x * 0.6 + (r() - 0.5) * 0.2,
      2.35 + r() * 0.7,
      top.z * 0.6 + (r() - 0.5) * 0.2
    );
    const end = new THREE.Vector3(
      (r() - 0.5) * 3.5,
      3.35 + r() * 1.3,
      (r() - 0.5) * 3.2
    );
    tube(start, end, 0.09, 0.035, M.trunk, g);
    branches.push(end);
  }
  const leafColors = ['#3f4c35', '#4c5a3d', '#586346', '#38452f', '#697354'];
  for (let c = 0; c < 5; c++) {
    const center = new THREE.Vector3((r() - 0.5) * 3.0, 3.9 + r() * 1.15, (r() - 0.5) * 2.7);
    const cluster = leafClusterMesh(leafColors, 46, 1.05 + r() * 0.35, seed + c * 10);
    cluster.position.copy(center);
    cluster.scale.set(1.3, 0.92, 1.22);
    g.add(cluster);
  }
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  landscape.add(g);
  return g;
}

function makeCypress(x, z, scale = 1, seed = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  const trunk = addCylinder(0.12, 0.22, 4.8, M.trunk, 0, 2.4, 0, 7, g);
  const r = rng(seed);
  const mat = M.leafDark.clone();
  mat.color = new THREE.Color('#35452f');
  mat.flatShading = true;
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const geo = new THREE.ConeGeometry(0.95 * (1 - t * 0.75), 1.25, 7);
    const cone = new THREE.Mesh(geo, mat);
    cone.position.set((r() - 0.5) * 0.15, 1.5 + t * 3.5, (r() - 0.5) * 0.15);
    cone.rotation.y = r() * Math.PI;
    cone.castShadow = true;
    cone.receiveShadow = true;
    g.add(cone);
  }
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  landscape.add(g);
  return g;
}

const bigTree = makeOliveTree(-10.9, -2.2, 1.55, 5);
const backTree = makeOliveTree(10.5, -5.6, 1.05, 9);
const frontTree = makeOliveTree(-7.9, 5.3, 0.7, 13);
const rightTree = makeOliveTree(13.4, 5.1, 0.57, 17);
const farRightTree = makeOliveTree(15.1, -2.8, 1.0, 19);
const farLeftTree = makeOliveTree(-15.4, 2.4, 1.25, 23);
makeCypress(7.6, -7.4, 1.2, 3);
makeCypress(-7.3, -8.2, 0.9, 8);
makeCypress(11.9, -10.2, 1.05, 11);
makeCypress(-13.9, -9.5, 1.2, 14);

// shrubs along the foundation and around the deck
const shrubGeo = new THREE.IcosahedronGeometry(0.42, 1);
const shrubMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, flatShading: true });
function addShrub(x, z, s = 1, seed = 1) {
  const r = rng(seed);
  const count = 9 + ((r() * 5) | 0);
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(shrubGeo, shrubMat.clone());
    mesh.material.color.set(['#3f4b35', '#48553b', '#525e42', '#39452f', '#606a4b'][i % 5]);
    mesh.position.set((r() - 0.5) * 1.55, 0.18 + r() * 0.55, (r() - 0.5) * 1.05);
    mesh.scale.set(0.48 + r() * 0.52, 0.38 + r() * 0.45, 0.48 + r() * 0.52);
    mesh.rotation.set(r() * 2, r() * 2, r() * 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  landscape.add(g);
  return g;
}
addShrub(-9.2, 2.9, 0.95, 22);
addShrub(-9.3, -0.2, 1.15, 44);
addShrub(9.0, 2.4, 0.95, 66);
addShrub(9.2, -0.7, 1.05, 77);
addShrub(9.2, 4.8, 0.7, 92);
addShrub(-9.0, 7.3, 0.75, 96);

// decorative grasses in the big planter
function addGrassClump(x, y, z, count, scale, parent = scene, seed = 1) {
  const r = rng(seed);
  const mat = new THREE.MeshStandardMaterial({ color: '#8b8a58', roughness: 0.95, side: THREE.DoubleSide });
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const h = (0.6 + r() * 0.7) * scale;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.018 * scale, h, 3), mat);
    blade.position.set((r() - 0.5) * 0.7 * scale, h / 2, (r() - 0.5) * 0.45 * scale);
    blade.rotation.z = (r() - 0.5) * 0.65;
    blade.rotation.x = (r() - 0.5) * 0.4;
    blade.rotation.y = r() * Math.PI;
    blade.castShadow = true;
    g.add(blade);
  }
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}
addGrassClump(-6.9, 0.78, 2.25, 45, 1.0, scene, 2);
addGrassClump(-5.9, 0.78, 2.25, 30, 0.85, scene, 4);
addGrassClump(5.45, 4.48, 0.72, 22, 0.55, upper, 5);

// lavender dots near the path
const lavenderMat = new THREE.MeshStandardMaterial({ color: '#8c7fa3', roughness: 0.85 });
for (let i = 0; i < 36; i++) {
  const x = -7.6 + Math.random() * 1.6;
  const z = 10.8 + Math.random() * 4.6;
  const stem = addCylinder(0.008, 0.012, 0.42, M.leafDark, x, 0.21, z, 5, scene, false);
  stem.rotation.z = (Math.random() - 0.5) * 0.25;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 4), lavenderMat);
  tip.position.set(x, 0.43, z);
  tip.scale.y = 2.3;
  scene.add(tip);
}

// small wildflower meadows around the olive trees
function addFlowerPatch(cx, cz, radius, count, color, seed = 1) {
  const r = rng(seed);
  const stemGeo = new THREE.CylinderGeometry(0.006, 0.009, 0.36, 3);
  const headGeo = new THREE.SphereGeometry(0.034, 4, 3);
  const stemMat = new THREE.MeshStandardMaterial({ color: '#5c6744', roughness: 1 });
  const headMat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const stems = new THREE.InstancedMesh(stemGeo, stemMat, count);
  const heads = new THREE.InstancedMesh(headGeo, headMat, count);
  const d = new THREE.Object3D();
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const rad = Math.sqrt(r()) * radius;
    const x = cx + Math.cos(a) * rad;
    const z = cz + Math.sin(a) * rad;
    const h = 0.25 + r() * 0.35;
    d.position.set(x, h * 0.5, z);
    d.rotation.set((r() - 0.5) * 0.15, r() * 3, (r() - 0.5) * 0.18);
    d.scale.set(1, h / 0.36, 1);
    d.updateMatrix();
    stems.setMatrixAt(i, d.matrix);
    d.position.set(x, h, z);
    d.scale.set(1, 2.0 + r() * 1.1, 1);
    d.rotation.set(0, 0, 0);
    d.updateMatrix();
    heads.setMatrixAt(i, d.matrix);
    c.set(color).offsetHSL((r() - 0.5) * 0.03, (r() - 0.5) * 0.1, (r() - 0.5) * 0.12);
    heads.setColorAt(i, c);
  }
  stems.castShadow = false;
  heads.castShadow = false;
  stems.receiveShadow = true;
  heads.receiveShadow = true;
  scene.add(stems, heads);
}
addFlowerPatch(12.4, 6.1, 1.9, 75, '#8a7aa2', 31);
addFlowerPatch(10.6, -1.6, 1.5, 55, '#d7cba9', 32);
addFlowerPatch(-12.2, 6.7, 1.8, 65, '#8a7aa2', 33);
addFlowerPatch(-11.6, -5.1, 1.2, 40, '#d7cba9', 34);

// tufts of ornamental grass at the base of the new trees
addGrassClump(12.0, 0.02, 3.7, 26, 0.8, scene, 41);
addGrassClump(14.2, 0.02, -1.0, 22, 0.7, scene, 42);
addGrassClump(-12.4, 0.02, 4.1, 24, 0.75, scene, 43);

/* ------------------------------------------------------------
   Outdoor furniture & fire
------------------------------------------------------------ */
function makeLounger(x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, 0.34, z);
  g.rotation.y = rotY;
  // oriented along local z, head at -z
  for (const sx of [-0.39, 0.39]) {
    addBox(0.075, 0.12, 2.05, M.teak, sx, 0.3, 0, { parent: g, r: 0.02 });
  }
  for (const sx of [-0.39, 0.39]) {
    for (const sz of [-0.78, 0.78]) addBox(0.07, 0.26, 0.07, M.teak, sx, 0.13, sz, { parent: g });
  }
  addBox(0.82, 0.1, 1.55, M.linen, 0, 0.39, 0.18, { parent: g, r: 0.04 });
  const back = addBox(0.82, 0.1, 0.78, M.linen, 0, 0.65, -0.75, { parent: g, r: 0.04 });
  back.rotation.x = -0.68;
  addBox(0.55, 0.13, 0.3, M.whiteFabric, 0, 0.52, -1.0, { parent: g, r: 0.05 });
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  landscape.add(g);
  return g;
}
makeLounger(-2.15, 4.95, -Math.PI / 2);
makeLounger(-4.45, 4.95, -Math.PI / 2);

// side table
addCylinder(0.3, 0.3, 0.45, M.ceramic, -3.3, 0.57, 4.95, 24, scene);
addCylinder(0.34, 0.34, 0.03, M.darkWood, -3.3, 0.81, 4.95, 24, scene);
addCylinder(0.09, 0.11, 0.18, M.glass, -3.3, 0.92, 4.95, 16, scene, false);

// fire bowl
const fireGroup = new THREE.Group();
fireGroup.position.set(7.05, 0.34, 6.32);
scene.add(fireGroup);
addCylinder(0.72, 0.54, 0.36, M.darkStone, 0, 0.18, 0, 32, fireGroup);
addCylinder(0.61, 0.61, 0.06, M.blackMetal, 0, 0.36, 0, 32, fireGroup);
addCylinder(0.52, 0.52, 0.02, new THREE.MeshStandardMaterial({
  color: 0x150b05,
  emissive: new THREE.Color(0xff5b19),
  emissiveIntensity: 0.5,
  roughness: 0.7,
}), 0, 0.39, 0, 32, fireGroup, false);
const fireSprites = [];
const flameBasePositions = [
  [0, 0.92, 0, 0.9], [-0.17, 0.84, 0.12, 0.66], [0.18, 0.83, -0.07, 0.7],
  [0.08, 0.86, 0.19, 0.6], [-0.11, 0.85, -0.17, 0.58], [0.01, 0.88, -0.2, 0.48],
];
for (let i = 0; i < flameBasePositions.length; i++) {
  const [x, y, z, s] = flameBasePositions[i];
  const mat = new THREE.SpriteMaterial({
    map: flameTex,
    color: new THREE.Color(i % 2 ? '#ffc46a' : '#ff8a3d'),
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.set(x, y, z);
  sprite.scale.set(0.55 * s, 1.3 * s, 1);
  sprite.renderOrder = 20;
  fireGroup.add(sprite);
  fireSprites.push({ sprite, mat, base: new THREE.Vector3(x, y, z), scale: s, phase: i * 2.1 });
}
const fireLight = new THREE.PointLight(0xff7836, 1.6, 8, 2);
fireLight.position.set(7.05, 1.3, 6.32);
scene.add(fireLight);
const fireGlow = glowSprite(0xff7b2e, 3.2, 0.12, 7.05, 0.95, 6.32);
fireGlow.sprite.material.color.set('#ff8a3d');

// small bollard near entry
addCylinder(0.055, 0.07, 0.45, M.blackMetal, 2.7, 0.24, 2.1, 12, scene);
addBox(0.14, 0.05, 0.14, entryGlow, 2.7, 0.49, 2.1, { parent: scene, cast: false });

/* ------------------------------------------------------------
   Lighting
------------------------------------------------------------ */
const hemi = new THREE.HemisphereLight(0x9fc2e3, 0x55422f, 0.55);
scene.add(hemi);

const ambient = new THREE.AmbientLight(0xd8e7f7, 0.1);
scene.add(ambient);

const sunLight = new THREE.DirectionalLight(0xffd0a0, 5.4);
sunLight.position.set(29, 16, 19);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 90;
sunLight.shadow.camera.left = -24;
sunLight.shadow.camera.right = 24;
sunLight.shadow.camera.top = 22;
sunLight.shadow.camera.bottom = -16;
sunLight.shadow.bias = -0.00035;
sunLight.shadow.normalBias = 0.026;
sunLight.target.position.set(0, 2, -1);
scene.add(sunLight);
scene.add(sunLight.target);

const fillLight = new THREE.DirectionalLight(0xa8c4e2, 0.28);
fillLight.position.set(-18, 10, 13);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffaa71, 0.34);
rimLight.position.set(-12, 8, -20);
scene.add(rimLight);

/* ------------------------------------------------------------
   Environment maps
------------------------------------------------------------ */
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
const envDayTex = makeEnvTexture(false);
const envNightTex = makeEnvTexture(true);
const envDay = pmrem.fromEquirectangular(envDayTex).texture;
const envNight = pmrem.fromEquirectangular(envNightTex).texture;
scene.environment = envDay;
scene.environmentIntensity = 0.9;
envDayTex.dispose();
envNightTex.dispose();

/* ------------------------------------------------------------
   Collections used by the day / night transition
------------------------------------------------------------ */
const glowMats = [
  { mat: eaveGlowMat, day: 1.2, night: 4.5 },
  ...eaveGlowMats,
  ...pathGlowMats,
  ...poolGlowMats,
  { mat: upperInnerMat, day: 0.07, night: 1.2 },
  { mat: lampShadeMat, day: 1.4, night: 3.2 },
  { mat: entryGlow, day: 0.8, night: 2.6 },
];
const glowSprites = [
  ...eaveGlows,
  ...pendantGlows,
  ...pathGlows,
  lampGlow,
  fireGlow,
];
for (const g of glowSprites) g.dayOpacity = g.baseOpacity;

// collect the 4 eave glow sprites more reliably by filtering, above may include other sprites
// (they were all added to house; only eave glows live there)

const pointLightsDayNight = [
  ...interiorLights.map((l) => ({ ...l, active: true })),
  { light: fireLight, day: 1.7, night: 4.6 },
  ...pathLights.map((l) => ({ light: l, day: 0, night: 5 })),
  { light: treeSpot, day: 0, night: 18 },
  { light: treeSpot2, day: 0, night: 12 },
  { light: entryPoint, day: 1.1, night: 1.7 },
  { light: poolPoint, day: 0, night: 2.6 },
];

/* ------------------------------------------------------------
   Day / night transition
------------------------------------------------------------ */
const DAY = {
  top: new THREE.Color('#3f6b94'),
  mid: new THREE.Color('#9c8794'),
  horizon: new THREE.Color('#f2b286'),
  bottom: new THREE.Color('#5d5244'),
  haze: new THREE.Color('#ffd0a1'),
  sun: new THREE.Color('#ffd39a'),
  fog: new THREE.Color('#d2b296'),
  sunDir: new THREE.Vector3(29, 16, 19).normalize(),
  sunPos: new THREE.Vector3(29, 16, 19),
  sunColor: new THREE.Color('#ffd0a0'),
  fill: new THREE.Color('#a8c4e2'),
  hemiSky: new THREE.Color('#9fc2e3'),
  hemiGround: new THREE.Color('#55422f'),
};
const NIGHT = {
  top: new THREE.Color('#02050e'),
  mid: new THREE.Color('#081627'),
  horizon: new THREE.Color('#16293b'),
  bottom: new THREE.Color('#070b10'),
  haze: new THREE.Color('#32536a'),
  sun: new THREE.Color('#d3e5ff'),
  fog: new THREE.Color('#0b141b'),
  sunDir: new THREE.Vector3(-16, 22, -12).normalize(),
  sunPos: new THREE.Vector3(-16, 22, -12),
  sunColor: new THREE.Color('#8eadd9'),
  fill: new THREE.Color('#3c5d80'),
  hemiSky: new THREE.Color('#23446b'),
  hemiGround: new THREE.Color('#17130f'),
};

let modeTarget = 0;
let modeMix = 0;
let nightEnvActive = false;
let isAuto = false;

const skyTmp = new THREE.Color();
function applyMode(mix, dt) {
  const e = smoothstep(0, 1, mix);

  skyUniforms.uTop.value.lerpColors(DAY.top, NIGHT.top, e);
  skyUniforms.uMid.value.lerpColors(DAY.mid, NIGHT.mid, e);
  skyUniforms.uHorizon.value.lerpColors(DAY.horizon, NIGHT.horizon, e);
  skyUniforms.uBottom.value.lerpColors(DAY.bottom, NIGHT.bottom, e);
  skyUniforms.uHaze.value.lerpColors(DAY.haze, NIGHT.haze, e);
  skyUniforms.uSunColor.value.lerpColors(DAY.sun, NIGHT.sun, e);
  skyUniforms.uSunDir.value.lerpVectors(DAY.sunDir, NIGHT.sunDir, e).normalize();
  skyUniforms.uSunStrength.value = lerp(1.55, 0.6, e);
  waterUniforms.uSunDir.value.copy(skyUniforms.uSunDir.value);
  waterUniforms.uSunColor.value.lerpColors(DAY.sun, NIGHT.sun, e);
  waterUniforms.uNight.value = e;

  starMat.opacity = smoothstep(0.18, 0.9, e) * 0.95;

  scene.fog.color.lerpColors(DAY.fog, NIGHT.fog, e);
  scene.fog.near = lerp(90, 50, e);
  scene.fog.far = lerp(620, 380, e);

  sunLight.intensity = lerp(5.4, 0.28, e);
  sunLight.color.lerpColors(DAY.sunColor, NIGHT.sunColor, e);
  sunLight.position.lerpVectors(DAY.sunPos, NIGHT.sunPos, e);
  fillLight.intensity = lerp(0.28, 0.12, e);
  fillLight.color.lerpColors(DAY.fill, NIGHT.fill, e);
  rimLight.intensity = lerp(0.34, 0.08, e);
  hemi.intensity = lerp(0.55, 0.19, e);
  hemi.color.lerpColors(DAY.hemiSky, NIGHT.hemiSky, e);
  hemi.groundColor.lerpColors(DAY.hemiGround, NIGHT.hemiGround, e);
  ambient.intensity = lerp(0.1, 0.08, e);

  renderer.toneMappingExposure = lerp(1.07, 1.14, e);
  scene.environmentIntensity = lerp(0.66, 0.26, e);

  if (e > 0.48 && !nightEnvActive) {
    scene.environment = envNight;
    nightEnvActive = true;
  } else if (e <= 0.48 && nightEnvActive) {
    scene.environment = envDay;
    nightEnvActive = false;
  }

  for (const { mat, day, night } of glowMats) {
    mat.emissiveIntensity = lerp(day, night, e);
  }
  for (const { light, day, night } of pointLightsDayNight) {
    light.intensity = lerp(day, night, e);
  }
  for (const g of glowSprites) {
    g.mat.opacity = g.dayOpacity * lerp(1, 2.6, e);
  }
  for (const m of mountainLayers) {
    m.mat.color.lerpColors(m.day, m.night, e);
  }
  fireGlow.mat.opacity = lerp(0.1, 0.3, e);
}

/* ------------------------------------------------------------
   Interaction
------------------------------------------------------------ */
const modeBtn = document.getElementById('modeBtn');
const modeLabel = document.getElementById('modeLabel');
const orbitBtn = document.getElementById('orbitBtn');
const resetBtn = document.getElementById('resetBtn');
const loader = document.getElementById('loader');

function setNight(on) {
  modeTarget = on ? 1 : 0;
  modeLabel.textContent = on ? '暮色' : '夜幕';
  modeBtn.setAttribute('aria-label', on ? '切换到黄昏' : '切换到夜晚');
  modeBtn.classList.toggle('night', on);
}
modeBtn.addEventListener('click', () => {
  setNight(modeTarget < 0.5);
});

function setAuto(on) {
  isAuto = on;
  controls.autoRotate = on;
  orbitBtn.style.borderColor = on ? 'rgba(216,185,141,.6)' : '';
  orbitBtn.style.color = on ? '#e6c79a' : '';
}
orbitBtn.addEventListener('click', () => setAuto(!isAuto));
controls.addEventListener('start', () => {
  if (isAuto) setAuto(false);
});

let viewTween = null;
resetBtn.addEventListener('click', () => {
  const home = homeView();
  camera.fov = home.fov;
  camera.updateProjectionMatrix();
  viewTween = {
    start: performance.now(),
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toPos: home.cam,
    toTarget: home.target,
  };
  setAuto(false);
});

/* ------------------------------------------------------------
   Resize
------------------------------------------------------------ */
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  const nowPortrait = window.innerWidth / window.innerHeight < 0.8;
  if (nowPortrait !== layoutPortrait) {
    layoutPortrait = nowPortrait;
    const home = homeView();
    camera.fov = home.fov;
    camera.position.copy(home.cam);
    controls.target.copy(home.target);
    controls.update();
    viewTween = null;
  }
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

/* ------------------------------------------------------------
   Animation
------------------------------------------------------------ */
const clock = new THREE.Clock();
let elapsed = 0;
let firstFrame = true;

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  if (viewTween) {
    const t = smoothstep(0, 1, Math.min((performance.now() - viewTween.start) / 1250, 1));
    camera.position.lerpVectors(viewTween.fromPos, viewTween.toPos, t);
    controls.target.lerpVectors(viewTween.fromTarget, viewTween.toTarget, t);
    if (t >= 1) viewTween = null;
  }

  if (Math.abs(modeTarget - modeMix) > 0.0004) {
    modeMix += (modeTarget - modeMix) * Math.min(1, dt * 2.25);
  } else {
    modeMix = modeTarget;
  }
  applyMode(modeMix, dt);

  controls.update(dt);

  waterUniforms.uTime.value = elapsed;

  // flames
  for (const f of fireSprites) {
    const flicker = 0.72 + 0.28 * Math.sin(elapsed * 8.5 + f.phase) + 0.12 * Math.sin(elapsed * 19 + f.phase * 3);
    f.mat.opacity = clamp(flicker, 0.35, 1) * lerp(0.72, 0.95, modeMix);
    f.sprite.scale.set(0.55 * f.scale * (0.92 + 0.14 * Math.sin(elapsed * 11 + f.phase)), 1.3 * f.scale * (0.82 + 0.3 * flicker), 1);
    f.sprite.position.y = f.base.y + 0.04 * Math.sin(elapsed * 7 + f.phase);
    f.sprite.position.x = f.base.x + 0.025 * Math.sin(elapsed * 5 + f.phase * 2);
  }
  const fireFlicker = 0.82 + 0.18 * Math.sin(elapsed * 12.3) + 0.08 * Math.sin(elapsed * 27.7);
  if (pointLightsDayNight) {
    const base = lerp(1.7, 4.6, smoothstep(0, 1, modeMix));
    fireLight.intensity = base * fireFlicker;
  }

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    setTimeout(() => loader.classList.add('hidden'), 650);
  }
}

renderer.setAnimationLoop(animate);

// expose a tiny handle for debugging / screenshots
window.__CASA__ = {
  scene,
  camera,
  controls,
  renderer,
  setNight,
  setAuto,
  setModeInstant(on) {
    modeTarget = modeMix = on ? 1 : 0;
    setNight(!!on);
    applyMode(modeMix, 0);
  },
  async downloadGLB(filename = 'casa-serena.glb') {
    const hidden = [];
    const waterOriginal = water.material;
    // custom shaders, points and sprites are not portable in glTF
    scene.traverse((o) => {
      if (!o.visible) return;
      if (o.isPoints || o.isSprite || o.material?.isShaderMaterial) {
        hidden.push(o);
        o.visible = false;
      }
    });
    water.material = new THREE.MeshStandardMaterial({
      color: 0x2f7b85,
      roughness: 0.08,
      metalness: 0.35,
      transparent: true,
      opacity: 0.92,
    });
    water.visible = true;

    try {
      const exporter = new GLTFExporter();
      const data = await new Promise((resolve, reject) => {
        exporter.parse(
          scene,
          (result) => resolve(result),
          (err) => reject(err),
          { binary: true, onlyVisible: true }
        );
      });
      const blob = new Blob([data], { type: 'model/gltf-binary' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return blob.size;
    } finally {
      water.material = waterOriginal;
      for (const o of hidden) o.visible = true;
    }
  },
};
