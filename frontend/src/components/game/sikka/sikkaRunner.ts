/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { disposeHierarchy, SceneMetrics } from './sceneResources';
import {
  getTrackCurve,
  simulateJumpStep,
  checkSphereObstacleCollision,
  checkSweptSphereObstacleCollision,
  LANE_OFFSETS,
  LaneIndex,
  calculateBallSpeed,
  INITIAL_ROLL_SPEED,
} from './trackMath';
import {
  SharedMaterials,
  createAstrolabePlayer,
} from './proceduralModels';
import {
  SikkaChunk,
  CHUNK_LENGTH,
  TOTAL_CHUNKS,
} from './ribbonChunk';
import { SceneryPool } from './sceneryPool';
import { globalWind } from './wind';
import { sound } from './audio';
import { FrameBudget, renderPixelRatio, sharpPixelRatio } from './frameBudget';
import { SceneryMaterials } from './sceneryMaterials';
import {
  ParcelPickup,
  type ParcelStatus,
  GAHWA_STORY_CARD,
  type DeliveryStoryCard,
} from './parcelDelivery';

export type GameState = 'ready' | 'countdown' | 'running' | 'zooming' | 'ended';

export interface SikkaFork {
  distance: number;
  leftChoice: string;
  rightChoice: string;
  leftIcon: string;
  rightIcon: string;
}

export const SIKKA_FORKS: SikkaFork[] = [
  {
    distance: 220,
    leftChoice: 'Sikka Art Quarter',
    rightChoice: 'Barjeel Windtowers',
    leftIcon: '🎨',
    rightIcon: '🏛️',
  },
  {
    distance: 440,
    leftChoice: 'Historic Coins Museum',
    rightChoice: 'Dubai Creek Dhow Pier',
    leftIcon: '🪙',
    rightIcon: '⛵',
  },
  {
    distance: 660,
    leftChoice: 'Traditional Majlis & Gahwa',
    rightChoice: 'Al Bastakiya Spice Vault',
    leftIcon: '☕',
    rightIcon: '🌿',
  },
];

export interface DestinationCard {
  title: string;
  arabicTitle: string;
  category: string;
  description: string;
  heritageFact: string;
  recommendedTime: string;
  coordinates: string;
}

export const DESTINATIONS: Record<string, DestinationCard> = {
  'Sikka Art Quarter': {
    title: 'Sikka Art Quarter & XVA Gallery',
    arabicTitle: 'حي السكة للفنون ومعرض إكس في إيه',
    category: 'Contemporary Heritage & Art',
    description: 'A labyrinthine sanctuary where 19th-century courtyard houses host modern Middle Eastern artists, secret shaded cafes, and hand-carved installations.',
    heritageFact: 'Built within traditional coral stone homes with shaded palm-frond awnings that naturally cool the walkways by up to 8°C.',
    recommendedTime: 'Late Afternoon / Dusk (4:30 PM)',
    coordinates: '25.2637° N, 55.2972° E',
  },
  'Barjeel Windtowers': {
    title: 'Majestic Barjeel Architectural Walk',
    arabicTitle: 'أبراج الرياح البراجيل التراثية',
    category: 'Vernacular Architecture',
    description: 'The monumental natural cooling towers of Old Dubai, rising up to 18 meters with distinct four-way open vents catching the Arabian Gulf sea breezes.',
    heritageFact: 'Before air conditioning, Barjeel windtowers funneled breezes downward into living majlis rooms through clever pressure differentials.',
    recommendedTime: 'Golden Hour (5:00 PM)',
    coordinates: '25.2642° N, 55.2985° E',
  },
  'Historic Coins Museum': {
    title: 'Heritage Coins Museum & Courtyard',
    arabicTitle: 'متحف المسكوكات التراثي',
    category: 'Numismatic History',
    description: 'Tucked inside an authentic two-storey coral house featuring over 470 rare gold, silver, and bronze Islamic and regional dirham coins spanning millennia.',
    heritageFact: 'Located right next to the historic city wall remains constructed from fossilized coral and gypsum mortar in 1800.',
    recommendedTime: 'Morning or Twilight',
    coordinates: '25.2648° N, 55.2968° E',
  },
  'Dubai Creek Dhow Pier': {
    title: 'Creek Waterfront & Abra Crossing',
    arabicTitle: 'خور دبي ومحطة العبرات التراثية',
    category: 'Maritime History',
    description: 'The vibrant lifeline of ancient Dubai trade, where traditional wooden dhows unload fragrant cardamom, cloves, and woven rugs right onto the stone quayside.',
    heritageFact: 'Al Fahidi served as Dubai\'s primary merchant hub connecting Indian Ocean trade routes directly to Arabian markets.',
    recommendedTime: 'Sunset (5:30 PM)',
    coordinates: '25.2655° N, 55.2990° E',
  },
  'Traditional Majlis & Gahwa': {
    title: 'Heritage Gahwa Café & Majlis',
    arabicTitle: 'مجلس القهوة العربية التراثي',
    category: 'Emirati Hospitality',
    description: 'An open-air majlis dressed in crimson Sadu geometric cushions where authentic Emirati Gahwa spiced with cardamom and saffron is poured from golden Dallahs.',
    heritageFact: 'Serving Arabic gahwa is an intangible UNESCO cultural heritage representing generous Bedouin hospitality and community honor.',
    recommendedTime: 'Evening (6:00 PM)',
    coordinates: '25.2639° N, 55.2979° E',
  },
  'Al Bastakiya Spice Vault': {
    title: 'Old Souq Spice & Oud Vaults',
    arabicTitle: 'سوق التوابل وبخور العود التراثي',
    category: 'Sensory Cultural Market',
    description: 'Historic vaulted merchant corridors overflowing with conical piles of fiery Iranian saffron, dried Persian loomi lime, and smoky Cambodi oud wood chips.',
    heritageFact: 'Merchants historically stored precious saffron and oud resins in brass-studded teak sea chests (Mandoos) to preserve fragrances in the desert heat.',
    recommendedTime: 'Late Evening',
    coordinates: '25.2645° N, 55.2960° E',
  },
};

export interface RunnerCallbacks {
  onScoreUpdate: (score: number, coins: number, distance: number, lives: number) => void;
  onForkApproaching: (fork: SikkaFork | null) => void;
  onGameEnd: (stats: {
    score: number;
    coins: number;
    distance: number;
    destination: DestinationCard;
    visitedForks: string[];
    deliveryCard?: DeliveryStoryCard | null;
  }) => void;
  onStateChange: (state: GameState) => void;
  onRequestCountdown?: () => void;
  onParcelChange?: (status: ParcelStatus) => void;
  onDeliveryWindowChange?: (inWindow: boolean) => void;
  onPerformanceUpdate?: (fps: number) => void;
}

export class SikkaRunnerEngine {
  private container: HTMLElement;
  private callbacks: RunnerCallbacks;

  // Three.js Core
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private materials: SharedMaterials;
  private sceneryPool!: SceneryPool;
  private isSoftwareGl: boolean = false;
  private resizeObserver: ResizeObserver | null = null;
  private animationFrameId: number = 0;
  private isDestroyed: boolean = false;

  // One local player light; scenery uses the fixed sun and sky fill.
  private astrolabeLight!: THREE.PointLight;
  private keySun!: THREE.DirectionalLight;

  // Chunks & Geometry
  private chunks: SikkaChunk[] = [];
  private currentChunkCycle: number = 0;

  // Player Character
  private playerGroup: THREE.Group;
  private playerSphere: THREE.Mesh;
  private outerRing1: THREE.Mesh;
  private outerRing2: THREE.Mesh;
  private shadowDisc: THREE.Mesh;
  private parcel = new ParcelPickup();
  private carriedParcel = new THREE.Group();
  private lastInDeliveryWindow: boolean = false;
  private unlockedDeliveryCard: DeliveryStoryCard | null = null;

  // Player Physics & Movement State
  private targetLaneIndex: LaneIndex = 1; // 0=left, 1=center, 2=right
  private currentLaneOffset: number = 0;
  private playerZ: number = 0;
  private playerElevation: number = 0;
  private playerVelocityY: number = 0;
  private isJumping: boolean = false;
  private sphereRadius: number = 1.0;
  private rollAngle: number = 0;
  private physicsAccumulator: number = 0;

  // Dynamic Particles
  private moonGroup: THREE.Group = new THREE.Group();
  private dustParticles: THREE.Points;
  private dustPositions: Float32Array;
  private dustVelocities: Float32Array;
  private dustCount: number = 60;

  private duskSpecks: THREE.Points;
  private duskSpeckPositions: Float32Array;
  private duskSpeckCount: number = 45;

  // Game Progress & Metrics
  private gameState: GameState = 'ready';
  private forwardSpeed: number = INITIAL_ROLL_SPEED; // Slower start, accelerates over 5s
  private elapsedRunTime: number = 0; // Elapsed rolling run time for smooth acceleration
  private score: number = 0;
  private coinsCount: number = 0;
  private distanceRun: number = 0;
  private lives: number = 3;
  private invulnerableTimer: number = 0;
  private lastTime: number = 0;

  // Forks & Story graph
  private chosenForks: string[] = [];
  private chosenForksByForkIndex: Map<number, string> = new Map();
  private activeForkIndex: number = 0;
  private lastTriggeredForkDist: number = 0;

  // Fly-to-Sky Zoom-out animation
  private zoomProgress: number = 0;
  private zoomDuration: number = 2.2;
  private zoomStartCamPos = new THREE.Vector3();
  private zoomStartTarget = new THREE.Vector3();
  private lastDelta: number = 0.016;
  private metricsUpdatedAt = 0;
  private scoreUpdatedAt = 0;
  private frameBudget = new FrameBudget();
  private quality: 'sharp' | 'fast' = 'sharp';
  private sceneryMaterials = new SceneryMaterials();
  private sceneryElapsed = 0;

  // Reusable Math objects to avoid GC allocation in 60fps loop
  private readonly _vec3 = new THREE.Vector3();
  private readonly _camLook = new THREE.Vector3();
  private readonly _camTarget = new THREE.Vector3();

  constructor(container: HTMLElement, callbacks: RunnerCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Detect software WebGL
    this.isSoftwareGl = (() => {
      if (typeof document === 'undefined') return true;
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Initialize Three.js WebGLRenderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    const initWidth = container.clientWidth || 940;
    const initHeight = container.clientHeight || 520;
    this.renderer.setSize(initWidth, initHeight);
    this.renderer.setPixelRatio(sharpPixelRatio(initWidth, initHeight, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    // The player's existing ground disc supplies its shadow without a second scene pass.
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';

    // 3. Scene & Camera Setup
    this.scene = new THREE.Scene();
    // Open-air twilight: a cool upper sky against the warm stone and shop lamps.
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 32;
    skyCanvas.height = 512;
    const skyContext = skyCanvas.getContext('2d')!;
    const skyGradient = skyContext.createLinearGradient(0, 0, 0, 512);
    skyGradient.addColorStop(0, '#253d52');
    skyGradient.addColorStop(0.48, '#788b98');
    skyGradient.addColorStop(0.78, '#d5b292');
    skyGradient.addColorStop(1, '#e7c6a0');
    skyContext.fillStyle = skyGradient;
    skyContext.fillRect(0, 0, 32, 512);
    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    skyTexture.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = skyTexture;
    this.scene.fog = new THREE.FogExp2(0xc6a482, 0.014);

    // Desert Dusk Celestial Crescent Moon
    this.moonGroup = new THREE.Group();
    const moonShape = new THREE.Shape();
    moonShape.absarc(0, 0, 5, -Math.PI * 0.45, Math.PI * 0.45, false);
    moonShape.absarc(2.2, 0, 4.4, Math.PI * 0.45, -Math.PI * 0.45, true);
    const moonGeo = new THREE.ShapeGeometry(moonShape);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xfff0b3,
      side: THREE.DoubleSide,
    });
    const crescentMoon = new THREE.Mesh(moonGeo, moonMat);
    crescentMoon.position.set(25, 45, -160);
    crescentMoon.rotation.z = 0.35;
    this.moonGroup.add(crescentMoon);

    // Warm moon halo glow
    const haloGeo = new THREE.PlaneGeometry(24, 24);
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = 128;
    haloCanvas.height = 128;
    const hCtx = haloCanvas.getContext('2d')!;
    const hGrad = hCtx.createRadialGradient(64, 64, 2, 64, 64, 64);
    hGrad.addColorStop(0, 'rgba(255, 235, 170, 0.6)');
    hGrad.addColorStop(0.4, 'rgba(235, 180, 100, 0.2)');
    hGrad.addColorStop(1, 'rgba(53, 34, 67, 0)');
    hCtx.fillStyle = hGrad;
    hCtx.fillRect(0, 0, 128, 128);
    const haloTex = new THREE.CanvasTexture(haloCanvas);
    const haloMat = new THREE.MeshBasicMaterial({
      map: haloTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const moonHalo = new THREE.Mesh(haloGeo, haloMat);
    moonHalo.position.set(25, 45, -161);
    this.moonGroup.add(moonHalo);
    this.scene.add(this.moonGroup);

    this.camera = new THREE.PerspectiveCamera(
      56,
      (container.clientWidth || 1) / (container.clientHeight || 1),
      0.3,
      450,
    );

    // 4. Studio Environment Reflections (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.38;
    pmremGenerator.dispose();

    // 5. Lighting: Warm Golden Key + Warm Desert Bounce + Rim
    const hemiLight = new THREE.HemisphereLight(0xb8cfdf, 0x65412d, 1.0);
    this.scene.add(hemiLight);

    const keySun = this.keySun = new THREE.DirectionalLight(0xffd4a1, 2.4);
    keySun.position.set(-24, 32, 18);
    keySun.castShadow = false;
    this.scene.add(keySun);
    this.scene.add(keySun.target);

    const rimLight = new THREE.DirectionalLight(0x7593b1, 0.35);
    rimLight.position.set(-25, 20, -35);
    this.scene.add(rimLight);

    // Lanterns retain their emissive colour without five extra moving lights.
    this.astrolabeLight = new THREE.PointLight(0xffd700, 2.4, 12, 1.4);
    this.scene.add(this.astrolabeLight);

    // 6. Materials & Models Setup
    this.materials = new SharedMaterials();
    this.sceneryPool = new SceneryPool(this.materials);

    // Astrolabe Player
    const playerParts = createAstrolabePlayer(this.materials);
    this.playerGroup = playerParts.group;
    this.playerSphere = playerParts.sphere;
    this.outerRing1 = playerParts.outerRing1;
    this.outerRing2 = playerParts.outerRing2;
    this.shadowDisc = playerParts.shadowDisc;
    this.scene.add(this.playerGroup);

    // Cloth parcel sits above the spinning rings; it follows the player root,
    // so steering/jumping carry it without tumbling it through the astrolabe.
    const parcelBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 0.48, 0.68), this.materials.saduCloth,
    );
    const crossTie = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.50, 0.70), this.materials.goldMetal,
    );
    const longTie = new THREE.Mesh(
      new THREE.BoxGeometry(0.90, 0.50, 0.10), this.materials.goldMetal,
    );
    this.carriedParcel.name = 'merchant-parcel';
    this.carriedParcel.add(parcelBody, crossTie, longTie);
    this.carriedParcel.position.set(0, 1.65, 0);
    this.carriedParcel.rotation.y = 0.2;
    this.carriedParcel.visible = false;
    this.playerGroup.add(this.carriedParcel);

    // 7. Golden Dusk Floating Specks (Treadmill Illusion Breaker)
    this.duskSpeckPositions = new Float32Array(this.duskSpeckCount * 3);
    for (let i = 0; i < this.duskSpeckCount; i++) {
      this.duskSpeckPositions[i * 3] = (Math.random() - 0.5) * 16;
      this.duskSpeckPositions[i * 3 + 1] = Math.random() * 8 + 0.5;
      this.duskSpeckPositions[i * 3 + 2] = -Math.random() * 100;
    }
    const speckGeo = new THREE.BufferGeometry();
    speckGeo.setAttribute('position', new THREE.BufferAttribute(this.duskSpeckPositions, 3));
    const speckMat = new THREE.PointsMaterial({
      color: 0xffd269,
      size: 0.055,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    this.duskSpecks = new THREE.Points(speckGeo, speckMat);
    this.scene.add(this.duskSpecks);

    // 8. Sand Dust Puff Particles (for landing effect)
    this.dustPositions = new Float32Array(this.dustCount * 3);
    this.dustVelocities = new Float32Array(this.dustCount * 3);
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xdeb887,
      size: 0.22,
      transparent: true,
      opacity: 0,
    });
    this.dustParticles = new THREE.Points(dustGeo, dustMat);
    this.scene.add(this.dustParticles);

    // 9. Build Initial Track Ribbon Chunks (covers 560m active buffer)
    for (let i = 0; i < TOTAL_CHUNKS; i++) {
      const chunk = new SikkaChunk(i, this.materials, this.sceneryPool);
      const startZ = -i * CHUNK_LENGTH;
      chunk.rebuild(startZ, i);
      this.sceneryMaterials.apply(chunk.group);
      chunk.updateVisibility(this.playerZ);
      this.scene.add(chunk.group);
      this.chunks.push(chunk);
    }
    this.currentChunkCycle = TOTAL_CHUNKS;

    // 10. Position player at starting curve position
    this.updatePlayerTransform(0);

    // Set initial camera
    this.updateCamera(0, 1.0);

    // Bind event listeners
    this.handleResize = this.handleResize.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);

    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      (window as any).__sikkaEngine = this;
    }

    if (typeof ResizeObserver !== 'undefined' && this.container) {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      this.resizeObserver.observe(this.container);
    }

    // Pre-warm shaders
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Start render loop
    this.lastTime = performance.now();
    this.tick = this.tick.bind(this);
    this.animationFrameId = requestAnimationFrame(this.tick);
    this.callbacks.onParcelChange?.(this.parcel.status);
  }

  public beginCountdown(): boolean {
    if (this.isDestroyed || this.gameState !== 'ready') return false;
    this.gameState = 'countdown';
    this.callbacks.onStateChange('countdown');
    return true;
  }

  public collectParcel(): boolean {
    if (this.isDestroyed) return false;
    const previous = this.parcel.status;
    const collected = this.parcel.collect(this.gameState, this.distanceRun);
    this.carriedParcel.visible = this.parcel.status === 'carrying';
    if (previous !== this.parcel.status) this.callbacks.onParcelChange?.(this.parcel.status);
    return collected;
  }

  public deliverParcel(): boolean {
    if (this.isDestroyed) return false;
    const previous = this.parcel.status;
    const delivered = this.parcel.deliver(this.gameState, this.distanceRun);
    if (delivered) {
      this.carriedParcel.visible = false;
      this.unlockedDeliveryCard = GAHWA_STORY_CARD;
      sound.playCoin();
      if (previous !== this.parcel.status) this.callbacks.onParcelChange?.(this.parcel.status);
      this.callbacks.onDeliveryWindowChange?.(false);
    }
    return delivered;
  }

  public startGame() {
    if (this.isDestroyed || (this.gameState !== 'ready' && this.gameState !== 'countdown')) return;
    this.gameState = 'running';
    this.elapsedRunTime = 0;
    this.forwardSpeed = INITIAL_ROLL_SPEED;
    this.callbacks.onStateChange('running');
    sound.setRolling(true, this.forwardSpeed);
  }

  public steerLeft() {
    if (this.targetLaneIndex > 0) {
      this.targetLaneIndex = (this.targetLaneIndex - 1) as LaneIndex;
      this.checkForkChoice('left');
    }
  }

  public steerRight() {
    if (this.targetLaneIndex < 2) {
      this.targetLaneIndex = (this.targetLaneIndex + 1) as LaneIndex;
      this.checkForkChoice('right');
    }
  }

  public jump() {
    if (!this.isJumping && this.gameState === 'running') {
      this.isJumping = true;
      this.playerVelocityY = 13.5; // v_y = 13.5 u/s
      sound.setRolling(false);
      sound.playJump();
    }
  }

  private checkForkChoice(direction: 'left' | 'right') {
    const nextFork = SIKKA_FORKS[this.activeForkIndex];
    if (!nextFork) return;

    const distToFork = nextFork.distance - this.distanceRun;
    if (distToFork <= 60 && distToFork >= -10) {
      const choice = direction === 'left' ? nextFork.leftChoice : nextFork.rightChoice;
      const prevChoice = this.chosenForksByForkIndex.get(this.activeForkIndex);
      if (prevChoice !== choice) {
        this.chosenForksByForkIndex.set(this.activeForkIndex, choice);
        this.syncChosenForks();
        sound.playCoin();
      }
    }
  }

  private syncChosenForks() {
    const forks: string[] = [];
    for (let i = 0; i < SIKKA_FORKS.length; i++) {
      const choice = this.chosenForksByForkIndex.get(i);
      if (choice) forks.push(choice);
    }
    this.chosenForks = forks;
  }

  private handleKeyDown(e: KeyboardEvent) {
    const target = e.target;
    if (e.altKey || e.ctrlKey || e.metaKey ||
        (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]'))) return;
    if (e.code === 'KeyE') {
      if (!e.repeat) {
        if (this.parcel.isDeliveryAvailable(this.gameState, this.distanceRun)) {
          this.deliverParcel();
        } else if (this.parcel.status === 'available') {
          this.collectParcel();
        }
      }
      return;
    }
    // Let focused buttons handle Space natively (e.g. the parcel touch button).
    if (e.code === 'Space' && target instanceof HTMLElement && target.closest('button')) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      this.steerLeft();
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      this.steerRight();
    } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      if (this.gameState === 'ready') {
        if (this.callbacks.onRequestCountdown) {
          this.callbacks.onRequestCountdown();
        } else {
          this.startGame();
        }
      } else {
        this.jump();
      }
    }
  }

  public handleResize() {
    if (!this.container || this.isDestroyed) return;
    const width = this.container.clientWidth || 940;
    const height = this.container.clientHeight || 520;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.quality === 'sharp'
      ? sharpPixelRatio(width, height, window.devicePixelRatio || 1)
      : renderPixelRatio(width, height, window.devicePixelRatio || 1, this.frameBudget.scale));
    this.renderer.setSize(width, height);
  }

  public setQuality(quality: 'sharp' | 'fast') {
    this.quality = quality;
    this.handleResize();
  }

  private updatePlayerTransform(delta: number) {
    const targetOffset = LANE_OFFSETS[this.targetLaneIndex];
    // Smooth exponential steering interpolation
    const steerSmoothing = 1 - Math.exp(-12.0 * delta);
    this.currentLaneOffset += (targetOffset - this.currentLaneOffset) * steerSmoothing;

    // Track curve at current player Z
    const c = getTrackCurve(this.playerZ);

    const worldX = c.x + this.currentLaneOffset * c.nx;
    const worldY = c.y + this.sphereRadius + this.playerElevation;
    const worldZ = this.playerZ + this.currentLaneOffset * c.nz;

    this.playerGroup.position.set(worldX, worldY, worldZ);
    this.moonGroup.position.z = this.playerZ;

    // Track yaw rotation
    this.playerGroup.rotation.y = c.yaw;
    this.playerGroup.rotation.x = c.pitch;

    // Rolling physics: Delta theta = -moveDist / radius
    if (this.gameState === 'running') {
      const moveDist = this.forwardSpeed * delta;
      this.rollAngle -= moveDist / this.sphereRadius;
      this.playerSphere.rotation.x = this.rollAngle;

      // Gyroscopic orbital rings spin independently
      this.outerRing1.rotation.y += delta * 2.8;
      this.outerRing2.rotation.x += delta * 3.4;
    }

    // Shadow disc stays anchored to ground
    this.shadowDisc.position.y = -this.sphereRadius - this.playerElevation + 0.04;
    const shadowMat = this.shadowDisc.material as THREE.MeshBasicMaterial;
    shadowMat.opacity = Math.max(0.1, 0.6 - this.playerElevation * 0.15);
  }

  private triggerLandingParticles(x: number, y: number, z: number) {
    const mat = this.dustParticles.material as THREE.PointsMaterial;
    mat.opacity = 0.8;

    for (let i = 0; i < this.dustCount; i++) {
      this.dustPositions[i * 3] = x + (Math.random() - 0.5) * 0.6;
      this.dustPositions[i * 3 + 1] = y + 0.05;
      this.dustPositions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.6;

      this.dustVelocities[i * 3] = (Math.random() - 0.5) * 5.0;
      this.dustVelocities[i * 3 + 1] = Math.random() * 3.5 + 1.2;
      this.dustVelocities[i * 3 + 2] = (Math.random() - 0.5) * 5.0;
    }
    this.dustParticles.geometry.attributes.position.needsUpdate = true;
  }

  private updateCamera(delta: number, lerpAlpha = 0.12) {
    const cCam = getTrackCurve(this.playerZ + 9.6);

    // Camera sits 9.6m behind player and 3.8m above player elevation:
    // Target Cam X = c_cam.x + laneOffset * 0.38 * c_cam.nx
    // Target Cam Y = c_cam.y + y_player + 3.8
    // Target Cam Z = Z + 9.6 + laneOffset * 0.38 * c_cam.nz
    const targetCamX = cCam.x + this.currentLaneOffset * 0.38 * cCam.nx;
    const targetCamY = cCam.y + this.playerElevation + 3.8;
    const targetCamZ = this.playerZ + 9.6 + this.currentLaneOffset * 0.38 * cCam.nz;

    this._camTarget.set(targetCamX, targetCamY, targetCamZ);

    if (lerpAlpha >= 1.0) {
      this.camera.position.copy(this._camTarget);
    } else {
      const k = 1 - Math.exp(-14.0 * delta);
      this.camera.position.lerp(this._camTarget, k);
    }

    // Look Ahead Aim: looks 18m ahead into the upcoming turn
    const lookAheadZ = this.playerZ - 18.0;
    const cLook = getTrackCurve(lookAheadZ);
    this._camLook.set(cLook.x, cLook.y + 1.2, lookAheadZ);
    this.camera.lookAt(this._camLook);

    // Subtle camera banking in turns
    const bankAngle = (this.currentLaneOffset / 3.2) * 0.06 - cCam.dx_dz * 0.08;
    this.camera.rotation.z = bankAngle;
  }

  private triggerFlyToSkyZoom() {
    this.gameState = 'zooming';
    this.callbacks.onStateChange('zooming');
    sound.setRolling(false);
    sound.playFanfare();

    this.zoomProgress = 0;
    this.zoomStartCamPos.copy(this.camera.position);
    this.zoomStartTarget.copy(this._camLook);
  }

  private updateZoomSequence(delta: number) {
    this.zoomProgress += delta;
    const t = Math.min(this.zoomProgress / this.zoomDuration, 1.0);
    // Smooth ease-in-out
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    // Launch vertically +42 u/s in Y, pulling back into top-down celestial perspective
    const targetY = this.zoomStartCamPos.y + 68 * ease;
    const targetZ = this.playerZ + 12 * (1 - ease);

    this.camera.position.x = THREE.MathUtils.lerp(this.zoomStartCamPos.x, this.playerGroup.position.x, ease * 0.9);
    this.camera.position.y = targetY;
    this.camera.position.z = THREE.MathUtils.lerp(this.zoomStartCamPos.z, targetZ, ease);

    // Look down directly at the miniature golden astrolabe resting in the sikka
    this._camLook.lerp(this.playerGroup.position, ease);
    this.camera.lookAt(this._camLook);

    if (t >= 1.0 && this.gameState === 'zooming') {
      this.endGame();
    }
  }

  private endGame() {
    this.gameState = 'ended';
    this.callbacks.onStateChange('ended');

    // Pick destination based on chosen forks or distance
    let destName = this.chosenForks[this.chosenForks.length - 1];
    if (!destName || !DESTINATIONS[destName]) {
      const keys = Object.keys(DESTINATIONS);
      destName = keys[Math.floor(this.distanceRun / 100) % keys.length];
    }
    const destination = DESTINATIONS[destName] || DESTINATIONS['Sikka Art Quarter'];

    this.callbacks.onGameEnd({
      score: this.score,
      coins: this.coinsCount,
      distance: Math.floor(this.distanceRun),
      destination,
      visitedForks: this.chosenForks,
      deliveryCard: this.unlockedDeliveryCard,
    });
  }

  private simulatePhysicsStep(dt: number) {
    const prevX = this.playerGroup.position.x;
    const prevY = this.playerGroup.position.y;
    const prevZ = this.playerGroup.position.z;

    // 1. Advance forward momentum with smooth acceleration
    this.elapsedRunTime += dt;
    this.forwardSpeed = calculateBallSpeed(this.elapsedRunTime, this.distanceRun);
    const moveZ = this.forwardSpeed * dt;
    this.playerZ -= moveZ;
    this.distanceRun += moveZ;
    const previousParcelStatus = this.parcel.status;
    this.parcel.advance(this.distanceRun);
    if (previousParcelStatus !== this.parcel.status) {
      this.callbacks.onParcelChange?.(this.parcel.status);
    }
    const inDeliveryWindow = this.parcel.isDeliveryAvailable(this.gameState, this.distanceRun);
    if (inDeliveryWindow !== this.lastInDeliveryWindow) {
      this.lastInDeliveryWindow = inDeliveryWindow;
      this.callbacks.onDeliveryWindowChange?.(inDeliveryWindow);
    }

    // 2. Jumping Physics (fixed-step simulation)
    if (this.isJumping) {
      const jumpRes = simulateJumpStep(this.playerElevation, this.playerVelocityY, dt, 32.0);
      this.playerElevation = jumpRes.elevation;
      this.playerVelocityY = jumpRes.velocity;
      if (jumpRes.landed) {
        this.isJumping = false;
        this.playerElevation = 0;
        this.playerVelocityY = 0;
        sound.setRolling(true, this.forwardSpeed);
        sound.playLandingCrunch();
        this.triggerLandingParticles(
          this.playerGroup.position.x,
          this.playerGroup.position.y - this.sphereRadius,
          this.playerGroup.position.z,
        );
      }
    } else {
      sound.setRolling(true, this.forwardSpeed);
    }

    // 3. Update player world position & orientation
    this.updatePlayerTransform(dt);

    const currX = this.playerGroup.position.x;
    const currY = this.playerGroup.position.y;
    const currZ = this.playerGroup.position.z;

    // 4. Invulnerability countdown
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    // 5. Continuous swept collision check against obstacles & coins
    for (let cIdx = 0; cIdx < this.chunks.length; cIdx++) {
      const chunk = this.chunks[cIdx];

      // Quick distance culling: skip chunks farther than 60m from player
      if (Math.abs(chunk.startZ - currZ) > 60) continue;

      // Collectibles: Coins (accurate 3D world elevation)
      for (const coin of chunk.getCoins()) {
        if (!coin.collected) {
          const cDist = Math.hypot(coin.worldX - currX, coin.worldZ - currZ);
          const diffY = Math.abs(coin.worldY - currY);
          if (cDist < 1.6 && diffY < 1.8) {
            coin.collected = true;
            coin.mesh.visible = false;
            this.coinsCount += 1;
            sound.playCoin();
          }
        }
      }

      // Obstacles: Swept collision using precise obstacle profiles and world height
      for (const obs of chunk.getObstacles()) {
        if (!obs.hit) {
          const hasCollision = checkSweptSphereObstacleCollision(
            prevX,
            prevY,
            prevZ,
            currX,
            currY,
            currZ,
            this.sphereRadius,
            obs.worldX,
            obs.worldY,
            obs.worldZ,
            obs.type,
          );

          if (hasCollision && this.invulnerableTimer <= 0) {
            obs.hit = true;
            this.lives -= 1;
            this.invulnerableTimer = 1.4;
            sound.playCrash();
            this.callbacks.onScoreUpdate(this.score, this.coinsCount, Math.floor(this.distanceRun), this.lives);

            if (this.lives <= 0) {
              this.triggerFlyToSkyZoom();
              return;
            }
          }
        }
      }
    }
  }

  private updateLighting() {
    if (!this.astrolabeLight) return;

    // Keep the sun direction consistent as the player follows the curved street.
    const sunlightTarget = getTrackCurve(this.playerZ - 20);
    this.keySun.position.set(sunlightTarget.x - 24, sunlightTarget.y + 32, this.playerZ + 5);
    this.keySun.target.position.set(sunlightTarget.x, sunlightTarget.y, this.playerZ - 20);
    this.keySun.target.updateMatrixWorld();

    // Astrolabe player light moves with player
    this.astrolabeLight.position.set(
      this.playerGroup.position.x,
      this.playerGroup.position.y + 0.6,
      this.playerGroup.position.z,
    );

  }

  private updateMerchants(now: number, delta: number) {
    const time = now * 0.001;
    for (let c = 0; c < this.chunks.length; c++) {
      const chunk = this.chunks[c];
      if (Math.abs(chunk.startZ - 20 - this.playerZ) > 45) continue;
      const merchants = chunk.getMerchants();
      for (let mIdx = 0; mIdx < merchants.length; mIdx++) {
        const m = merchants[mIdx];
        // worldZ is set when the shop moves; avoid walking every ancestor per merchant.
        const distZ = Math.abs(this.playerZ - m.worldZ);

        // 1. Natural procedural breathing motion
        const breath = Math.sin(time * 2.2) * 0.012;
        m.torso.position.y = 0.98 + breath;

        // 2. Head tracking: merchant naturally turns toward approaching runner
        if (distZ < 45) {
          const lookBlend = Math.max(0, Math.min(1, (45 - distZ) / 30));
          m.head.rotation.y = 0.22 * lookBlend + Math.sin(time * 1.5) * 0.04;
          m.head.rotation.x = -0.04 + breath * 0.3;

          // 3. Dignified Emirati greeting gesture as player approaches (between 35m and 6m)
          if (distZ < 35 && distZ > 6) {
            const wave = Math.sin(time * 3.8) * 0.1;
            m.rightShoulder.rotation.x = 0.52 + wave * 0.5;
            m.rightShoulder.rotation.z = 0.32;
            m.rightElbow.rotation.x = 0.82 + wave;
            m.rightHand.rotation.y = 0.35;
          } else {
            // Calm resting posture beside fabric rolls
            m.rightShoulder.rotation.x = 0.22;
            m.rightShoulder.rotation.z = 0.18;
            m.rightElbow.rotation.x = 0.42;
          }
        } else {
          m.head.rotation.y = 0.15;
          m.rightShoulder.rotation.x = 0.22;
          m.rightElbow.rotation.x = 0.42;
        }

        // 4. Subtle Farkha / Tarboosh neck tassel sway
        m.tarboosh.rotation.z = -0.12 + Math.sin(time * 3.2) * 0.08;
      }
    }
  }

  private tick(now: number) {
    if (this.isDestroyed) return;

    const frameDelta = Math.max(0, (now - this.lastTime) / 1000);
    const delta = Math.min(frameDelta, 0.25);
    this.lastTime = now;
    this.lastDelta = frameDelta;
    if (document.visibilityState === 'hidden' || this.gameState === 'ended') {
      this.physicsAccumulator = 0;
      this.frameBudget.sample(0, false);
      this.animationFrameId = requestAnimationFrame(this.tick);
      return;
    }
    if (this.frameBudget.sample(frameDelta, true) && this.quality === 'fast') this.handleResize();

    if (this.gameState === 'running') {
      // Fixed-step sub-stepping (bounded 60Hz fixed simulation with max 4 sub-steps)
      const FIXED_DT = 1 / 60;
      this.physicsAccumulator += delta;
      if (this.physicsAccumulator > FIXED_DT * 4) {
        this.physicsAccumulator = FIXED_DT * 4;
      }

      while (this.physicsAccumulator >= FIXED_DT) {
        this.physicsAccumulator -= FIXED_DT;
        this.simulatePhysicsStep(FIXED_DT);
        if (this.gameState !== 'running') break;
      }

      // Score based on distance & coins
      this.score = Math.floor(this.distanceRun * 2) + this.coinsCount * 10;
      // HUD text does not need a React render on every animation frame.
      if (now - this.scoreUpdatedAt >= 100 || this.gameState !== 'running') {
        this.scoreUpdatedAt = now;
        this.callbacks.onScoreUpdate(this.score, this.coinsCount, Math.floor(this.distanceRun), this.lives);
      }

      // Camera update
      this.updateCamera(delta);

      // Invulnerability shield feedback (smooth visual aura, no mesh flickering)
      const sphereMat = this.playerSphere.material as THREE.MeshStandardMaterial;
      if (this.invulnerableTimer > 0) {
        const pulse = Math.sin(now * 0.015) * 0.5 + 0.5;
        sphereMat.emissive.setHex(0xff8822);
        sphereMat.emissiveIntensity = 0.4 + pulse * 0.6;
      } else {
        sphereMat.emissive.setHex(0x000000);
        sphereMat.emissiveIntensity = 0.0;
      }
      this.playerSphere.visible = true;

      // Check Sikka Forks at every 220m
      const curFork = SIKKA_FORKS[this.activeForkIndex];
      if (curFork) {
        const distToFork = curFork.distance - this.distanceRun;
        if (distToFork <= 75 && distToFork >= -15) {
          this.callbacks.onForkApproaching(curFork);
        } else if (distToFork < -15) {
          this.callbacks.onForkApproaching(null);
          this.activeForkIndex++;
        }
      }

      // Check if player completed full grand run destination (e.g. 700m or manually triggered)
      if (this.distanceRun >= 720) {
        this.triggerFlyToSkyZoom();
      }

      // Track Recycling: Recycle oldest chunks that are > 60m behind the player
      let recycledChunk = true;
      let safetyCount = 0;
      while (recycledChunk && safetyCount < this.chunks.length) {
        recycledChunk = false;
        safetyCount++;
        for (const chunk of this.chunks) {
          if (chunk.startZ > this.playerZ + 60) {
            let furthestZ = 0;
            for (const c of this.chunks) {
              if (c.startZ < furthestZ) furthestZ = c.startZ;
            }
            const newStartZ = furthestZ - CHUNK_LENGTH;
            chunk.rebuild(newStartZ, this.currentChunkCycle++);
            this.sceneryMaterials.apply(chunk.group);
            recycledChunk = true;
            break;
          }
        }
      }

      // Coin visual spin
      for (const chunk of this.chunks) {
        for (const coin of chunk.getCoins()) {
          if (!coin.collected) {
            coin.mesh.rotation.z += delta * 4.0;
          }
        }
      }

      // Golden Dusk Specks update (treadmill illusion breaker)
      for (let i = 0; i < this.duskSpeckCount; i++) {
        const pz = this.duskSpeckPositions[i * 3 + 2];
        if (pz > this.playerZ + 10) {
          this.duskSpeckPositions[i * 3 + 2] = this.playerZ - 90 - Math.random() * 20;
          this.duskSpeckPositions[i * 3] = (Math.random() - 0.5) * 16 + this.playerGroup.position.x;
        }
      }
      this.duskSpecks.geometry.attributes.position.needsUpdate = true;

      // Landing dust particles simulation
      const dustMat = this.dustParticles.material as THREE.PointsMaterial;
      if (dustMat.opacity > 0) {
        dustMat.opacity = Math.max(0, dustMat.opacity - delta * 1.8);
        for (let i = 0; i < this.dustCount; i++) {
          this.dustPositions[i * 3] += this.dustVelocities[i * 3] * delta;
          this.dustPositions[i * 3 + 1] += this.dustVelocities[i * 3 + 1] * delta;
          this.dustPositions[i * 3 + 2] += this.dustVelocities[i * 3 + 2] * delta;
        }
        this.dustParticles.geometry.attributes.position.needsUpdate = true;
      }
    } else if (this.gameState === 'zooming') {
      this.updateZoomSequence(delta);
    } else if (this.gameState === 'ready') {
      if (this.outerRing1 && this.outerRing2) {
        this.outerRing1.rotation.y += delta * 0.8;
        this.outerRing2.rotation.x += delta * 0.6;
      }
    }

    // Coherent desert breeze simulation
    globalWind.update(delta);
    this.sceneryElapsed += delta;
    const animateScenery = this.sceneryElapsed >= 1 / 24;
    for (let i = 0; i < this.chunks.length; i++) {
      const c = this.chunks[i];
      c.updateVisibility(this.playerZ, this.isSoftwareGl ? 90 : 130);
      if (animateScenery && Math.abs(c.startZ - 20 - this.playerZ) <= 45) {
        c.updateWind(this.sceneryElapsed, this.playerZ);
      }
    }

    // Procedural merchant animation update (breathing, eye contact, and greeting wave)
    if (animateScenery) {
      this.updateMerchants(now, this.sceneryElapsed);
      this.sceneryElapsed = 0;
    }

    // Update stable light positions smoothly
    this.updateLighting();

    // Render frame
    this.renderer.render(this.scene, this.camera);
    if (now - this.metricsUpdatedAt >= 1000) {
      this.metricsUpdatedAt = now;
      this.sceneryMaterials.syncTextures();
      this.callbacks.onPerformanceUpdate?.(this.frameBudget.fps);
      this.renderer.domElement.dataset.sikkaMetrics = JSON.stringify({
        ...this.getMetrics(), softwareGl: this.isSoftwareGl,
        distance: Math.floor(this.distanceRun), state: this.gameState, quality: this.quality,
        pixelRatio: this.renderer.getPixelRatio(), resolutionScale: this.quality === 'fast' ? this.frameBudget.scale : 1,
      });
    }
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  public resetGame() {
    this.parcel.reset();
    this.carriedParcel.visible = false;
    this.unlockedDeliveryCard = null;
    this.lastInDeliveryWindow = false;
    this.callbacks.onParcelChange?.(this.parcel.status);
    this.callbacks.onDeliveryWindowChange?.(false);
    this.playerZ = 0;
    this.currentLaneOffset = 0;
    this.targetLaneIndex = 1;
    this.playerElevation = 0;
    this.playerVelocityY = 0;
    this.isJumping = false;
    this.score = 0;
    this.coinsCount = 0;
    this.distanceRun = 0;
    this.lives = 3;
    this.invulnerableTimer = 0;
    this.chosenForks = [];
    this.chosenForksByForkIndex.clear();
    this.activeForkIndex = 0;
    this.elapsedRunTime = 0;
    this.forwardSpeed = INITIAL_ROLL_SPEED;
    this.physicsAccumulator = 0;
    sound.setRolling(false);

    // Reset chunks
    this.currentChunkCycle = TOTAL_CHUNKS;
    for (let i = 0; i < TOTAL_CHUNKS; i++) {
      const startZ = -i * CHUNK_LENGTH;
      this.chunks[i].rebuild(startZ, i);
      this.sceneryMaterials.apply(this.chunks[i].group);
    }

    this.updatePlayerTransform(0);
    this.updateCamera(0, 1.0);
    this.gameState = 'ready';
    this.callbacks.onStateChange('ready');
    this.callbacks.onScoreUpdate(0, 0, 0, 3);
    this.callbacks.onForkApproaching(null);
  }

  public finishRunEarly() {
    if (this.gameState === 'running') {
      this.triggerFlyToSkyZoom();
    }
  }

  public getMetrics(): SceneMetrics {
    return {
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      triangles: this.renderer.info.render.triangles,
      drawCalls: this.renderer.info.render.calls,
      fps: this.frameBudget.fps,
    };
  }

  public destroy() {
    this.isDestroyed = true;
    if (typeof window !== 'undefined' && (window as any).__sikkaEngine === this) {
      delete (window as any).__sikkaEngine;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      clearTimeout(this.animationFrameId);
    }
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    sound.setRolling(false);

    // 1. Destroy track ribbon chunks and their local decor
    for (const chunk of this.chunks) {
      chunk.destroy();
    }
    this.chunks = [];

    if (this.sceneryPool) {
      this.sceneryPool.destroy();
    }

    // 2. Dispose player group & scene particles
    disposeHierarchy(this.playerGroup);
    disposeHierarchy(this.moonGroup);
    if (this.duskSpecks?.geometry) this.duskSpecks.geometry.dispose();
    if (this.dustParticles?.geometry) this.dustParticles.geometry.dispose();

    // 3. Dispose shared materials
    if (this.materials) {
      this.materials.dispose();
    }
    this.sceneryMaterials.dispose();

    // 4. Dispose scene environment map if present
    if (this.scene.environment && typeof this.scene.environment.dispose === 'function') {
      this.scene.environment.dispose();
    }
    if (this.scene.background instanceof THREE.Texture) this.scene.background.dispose();

    // 5. Dispose WebGL renderer and clean DOM
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
