/** Internal (logical) resolution. Phaser scales this up to fit the window. */
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

/** Size of one map tile, in internal pixels. */
export const TILE_SIZE = 16;

/** Player movement speed in internal pixels per second (in any direction, diagonals included). */
export const PLAYER_SPEED = 80;

/**
 * The player's collision box, relative to the top-left of its 16×16 sprite. It covers only the
 * feet so the head can overlap wall faces above, matching the 3/4 top-down look, and is narrower
 * than a tile so the player fits through 1-tile gaps.
 */
export const PLAYER_HITBOX = { width: 10, height: 6, offsetX: 3, offsetY: 9 } as const;

/** Draw order (higher is drawn on top). The tile layer is at the default depth 0. */
export const DEPTH = { decor: 0.5, vision: 1, actors: 2, effects: 3, icons: 4, overlay: 5 } as const;

/** Set to true to draw Arcade Physics bodies (hitboxes and velocities) for debugging. */
export const PHYSICS_DEBUG = false;
