import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  OrthographicCamera,
  RGBAFormat,
  Scene,
  SRGBColorSpace,
  UnsignedByteType,
  WebGLRenderer,
} from 'three';
import { bakeGround, groundFrameCount, worldSprites } from '@/game/art/bake.ts';
import { type CharacterLook, characterSheet, FRAME_HEIGHT, FRAME_WIDTH, frameRect } from '@/game/art/characters.ts';
import type { WorldPalette } from '@/game/art/palettes.ts';
import { createBuffer, fillEllipse, hex, type PixelBuffer } from '@/game/art/pixel.ts';
import { type Actor, animationFrame, pixelPosition } from '@/game/core/actor.ts';
import { cameraFor, depthFor } from '@/game/core/camera.ts';
import type { Tint } from '@/game/core/season.ts';
import type { GameSimulation } from '@/game/core/simulation.ts';
import { SCREEN_HEIGHT, SCREEN_WIDTH, TILE } from '@/game/core/types.ts';
import { packAtlas } from '@/game/render/atlas.ts';
import { buildSpriteBatch, type SpriteBatch, uvRect, writeQuadUv } from '@/game/render/batch.ts';
import type { TownMap } from '@/game/world/town-map.ts';

/** Textura de pixel art: sin suavizado, sin mipmaps, colores sRGB tal cual. */
export function pixelTexture(image: PixelBuffer): DataTexture {
  const texture = new DataTexture(
    new Uint8Array(image.data.buffer, image.data.byteOffset, image.data.byteLength),
    image.width,
    image.height,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Quad con origen arriba a la izquierda y v hacia abajo (convención de `batch.ts`). */
function quadGeometry(width: number, height: number): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([0, 0, 0, width, 0, 0, 0, -height, 0, width, -height, 0]), 3),
  );
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), 2));
  geometry.setIndex([0, 2, 1, 1, 2, 3]);
  return geometry;
}

interface CharacterView {
  readonly actor: Actor;
  readonly mesh: Mesh<BufferGeometry, MeshBasicMaterial>;
  readonly shadow: Mesh<BufferGeometry, MeshBasicMaterial>;
  readonly sheet: DataTexture;
  lastFrameKey: string;
}

/** Píxeles que la cabeza invade el tile de arriba. */
const HEAD_OFFSET = FRAME_HEIGHT - TILE;

/**
 * Dibuja el pueblo con three.js a la resolución real de la consola (256×192)
 * y deja que CSS lo escale con `image-rendering: pixelated`.
 *
 * Capas: suelo horneado (1 quad) → sombras → personajes (opacos, con z-buffer)
 * → edificios y objetos (1 malla, ordenada de atrás hacia adelante) → brillos → filtro horario.
 */
export class WorldRenderer {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new OrthographicCamera(0, SCREEN_WIDTH, 0, -SCREEN_HEIGHT, -10, 10);
  readonly #map: TownMap;
  #groundFrames: DataTexture[] = [];
  readonly #groundMesh: Mesh<BufferGeometry, MeshBasicMaterial>;
  #batch: SpriteBatch | null = null;
  #batchMesh: Mesh<BufferGeometry, MeshBasicMaterial> | null = null;
  #glowMesh: Mesh<BufferGeometry, MeshBasicMaterial> | null = null;
  readonly #tintMesh: Mesh<BufferGeometry, MeshBasicMaterial>;
  readonly #characters: CharacterView[] = [];
  readonly #shadowTexture: DataTexture;
  #animationFrame = -1;
  #zoom = 1;

  constructor(canvas: HTMLCanvasElement, map: TownMap) {
    this.#map = map;
    this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT, false);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setClearColor(new Color('#0d1220'));

    const groundMaterial = new MeshBasicMaterial();
    this.#groundMesh = new Mesh(quadGeometry(map.width * TILE, map.height * TILE), groundMaterial);
    this.#groundMesh.renderOrder = 0;
    this.scene.add(this.#groundMesh);

    const shadow = createBuffer(12, 4);
    fillEllipse(shadow, 6, 2, 6, 2, hex('#10182a66'));
    this.#shadowTexture = pixelTexture(shadow);

    const tintMaterial = new MeshBasicMaterial({ transparent: true, opacity: 0, depthTest: false, depthWrite: false });
    this.#tintMesh = new Mesh(quadGeometry(SCREEN_WIDTH, SCREEN_HEIGHT), tintMaterial);
    this.#tintMesh.renderOrder = 100;
    this.#tintMesh.position.set(0, 0, -1);
    this.camera.add(this.#tintMesh);
    this.scene.add(this.camera);
  }

  /** (Re)hornea suelo, edificios y objetos con la paleta de la estación. */
  setPalette(palette: WorldPalette): void {
    for (const texture of this.#groundFrames) texture.dispose();
    this.#groundFrames = Array.from({ length: groundFrameCount() }, (_, frame) =>
      pixelTexture(bakeGround(this.#map, palette, frame)),
    );
    this.#groundMesh.material.map = this.#groundFrames[0] ?? null;
    this.#groundMesh.material.needsUpdate = true;

    if (this.#batchMesh) {
      this.scene.remove(this.#batchMesh);
      this.#batchMesh.geometry.dispose();
      this.#batchMesh.material.map?.dispose();
      this.#batchMesh.material.dispose();
    }
    const sprites = worldSprites(this.#map, palette);
    const atlas = packAtlas(sprites.flatMap((sprite) => sprite.frames));
    const batch = buildSpriteBatch(sprites, atlas, this.#map.height);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(batch.positions, 3));
    geometry.setAttribute('uv', new BufferAttribute(batch.uvs, 2));
    geometry.setIndex(new BufferAttribute(batch.indices, 1));
    const material = new MeshBasicMaterial({
      map: pixelTexture(atlas.image),
      transparent: true,
      depthWrite: false,
    });
    this.#batch = batch;
    this.#batchMesh = new Mesh(geometry, material);
    this.#batchMesh.renderOrder = 2;
    this.#batchMesh.frustumCulled = false;
    this.scene.add(this.#batchMesh);
    this.#buildGlows();
  }

  /** Halos cálidos sobre los faroles (solo de noche/atardecer). */
  #buildGlows(): void {
    if (this.#glowMesh) {
      this.scene.remove(this.#glowMesh);
      this.#glowMesh.geometry.dispose();
      this.#glowMesh.material.map?.dispose();
      this.#glowMesh.material.dispose();
    }
    const lamps = this.#map.def.props.filter((prop) => prop.kind === 'lamp');
    const glow = createBuffer(32, 32);
    for (let radius = 15; radius > 0; radius -= 3) {
      fillEllipse(
        glow,
        16,
        16,
        radius,
        radius,
        hex(
          `#ffd27a${Math.round(10 + (15 - radius) * 2.2)
            .toString(16)
            .padStart(2, '0')}`,
        ),
      );
    }
    const positions = new Float32Array(lamps.length * 12);
    const uvs = new Float32Array(lamps.length * 8);
    const indices = new Uint32Array(lamps.length * 6);
    lamps.forEach((lamp, index) => {
      const x = lamp.x * TILE - 8;
      const y = lamp.y * TILE - 20;
      positions.set([x, -y, 0.99, x + 32, -y, 0.99, x, -(y + 32), 0.99, x + 32, -(y + 32), 0.99], index * 12);
      writeQuadUv(uvs, index, uvRect({ x: 0, y: 0, width: 32, height: 32 }, 32, 32));
      const vertex = index * 4;
      indices.set([vertex, vertex + 2, vertex + 1, vertex + 1, vertex + 2, vertex + 3], index * 6);
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
    geometry.setIndex(new BufferAttribute(indices, 1));
    const material = new MeshBasicMaterial({
      map: pixelTexture(glow),
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
    });
    this.#glowMesh = new Mesh(geometry, material);
    this.#glowMesh.renderOrder = 3;
    this.#glowMesh.frustumCulled = false;
    this.#glowMesh.visible = false;
    this.scene.add(this.#glowMesh);
  }

  /** Crea (o recrea) los sprites de los personajes. */
  setCharacters(entries: readonly { actor: Actor; look: CharacterLook }[]): void {
    for (const view of this.#characters) {
      this.scene.remove(view.mesh, view.shadow);
      view.mesh.geometry.dispose();
      view.mesh.material.dispose();
      view.shadow.geometry.dispose();
      view.shadow.material.dispose();
      view.sheet.dispose();
    }
    this.#characters.length = 0;
    const sheets = new Map<CharacterLook, DataTexture>();
    for (const { actor, look } of entries) {
      let sheet = sheets.get(look);
      if (!sheet) {
        sheet = pixelTexture(characterSheet(look));
        sheets.set(look, sheet);
      }
      const mesh = new Mesh(
        quadGeometry(FRAME_WIDTH, FRAME_HEIGHT),
        new MeshBasicMaterial({ map: sheet, alphaTest: 0.5 }),
      );
      mesh.renderOrder = 1;
      mesh.frustumCulled = false;
      const shadow = new Mesh(
        quadGeometry(12, 4),
        new MeshBasicMaterial({ map: this.#shadowTexture, transparent: true, depthWrite: false }),
      );
      shadow.renderOrder = 1;
      shadow.frustumCulled = false;
      this.scene.add(mesh, shadow);
      this.#characters.push({ actor, mesh, shadow, sheet, lastFrameKey: '' });
    }
  }

  setTint(tint: Tint): void {
    const material = this.#tintMesh.material;
    material.color.set(tint.color);
    material.opacity = tint.opacity;
    this.#tintMesh.visible = tint.opacity > 0;
    if (this.#glowMesh) this.#glowMesh.visible = tint.opacity >= 0.15;
  }

  /** Zoom de la cámara (1 = normal). Se usa para la entrada cinematográfica. */
  setZoom(zoom: number): void {
    this.#zoom = zoom;
  }

  #updateCharacter(view: CharacterView): void {
    const { actor, mesh, shadow } = view;
    const position = pixelPosition(actor);
    const frame = animationFrame(actor);
    const key = `${actor.facing}:${frame}`;
    if (key !== view.lastFrameKey) {
      const rect = frameRect(actor.facing, frame);
      const uv = mesh.geometry.getAttribute('uv') as BufferAttribute;
      const image = view.sheet.image as { width: number; height: number };
      writeQuadUv(uv.array as Float32Array, 0, uvRect(rect, image.width, image.height));
      uv.needsUpdate = true;
      view.lastFrameKey = key;
    }
    const z = depthFor(position.y + TILE, position.x, this.#map.height);
    mesh.position.set(position.x, -(position.y - HEAD_OFFSET), z);
    shadow.position.set(position.x + 2, -(position.y + TILE - 4), 0.01);
  }

  /** Dibuja un frame. `attractTime` (en ms) activa el paseo de cámara de la pantalla de título. */
  render(sim: GameSimulation, timeMs: number, attractTime: number | null = null): void {
    // Animación del agua, las flores y la fuente: 4 fotogramas por segundo.
    const animationFrameIndex = Math.floor(timeMs / 250);
    if (animationFrameIndex !== this.#animationFrame) {
      this.#animationFrame = animationFrameIndex;
      const groundFrame = this.#groundFrames[animationFrameIndex % Math.max(1, this.#groundFrames.length)];
      if (groundFrame) this.#groundMesh.material.map = groundFrame;
      const batch = this.#batch;
      const mesh = this.#batchMesh;
      if (batch && mesh && batch.animated.length > 0) {
        const uv = mesh.geometry.getAttribute('uv') as BufferAttribute;
        for (const animated of batch.animated) {
          const rect = animated.frames[animationFrameIndex % animated.frames.length];
          if (rect) writeQuadUv(uv.array as Float32Array, animated.quad, rect);
        }
        uv.needsUpdate = true;
      }
    }

    for (const view of this.#characters) this.#updateCharacter(view);

    // En la pantalla de título la cámara pasea sola por el pueblo ("modo demo").
    const focus =
      attractTime === null
        ? pixelPosition(sim.player)
        : {
            x: (this.#map.width * TILE) / 2 + Math.sin(attractTime / 9000) * (this.#map.width * TILE * 0.32),
            y: (this.#map.height * TILE) / 2 + Math.sin(attractTime / 6500) * (this.#map.height * TILE * 0.28),
          };
    const camera = cameraFor(focus, this.#map.width, this.#map.height, this.#zoom);
    this.camera.zoom = this.#zoom;
    this.camera.position.set(camera.x, -camera.y, 5);
    this.camera.updateProjectionMatrix();
    // El filtro horario acompaña al zoom para cubrir siempre toda la pantalla.
    const inverse = 1 / this.#zoom;
    this.#tintMesh.scale.set(inverse, inverse, 1);
    this.#tintMesh.position.set(
      SCREEN_WIDTH / 2 - (SCREEN_WIDTH / 2) * inverse,
      -SCREEN_HEIGHT / 2 + (SCREEN_HEIGHT / 2) * inverse,
      -1,
    );
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    for (const texture of this.#groundFrames) texture.dispose();
    this.#shadowTexture.dispose();
    this.renderer.dispose();
  }
}
