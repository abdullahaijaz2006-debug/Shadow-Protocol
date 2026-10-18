import type Phaser from "phaser";
import { distance, type Vector } from "../geometry";
import type { LevelGrid } from "../level/grid";
import { findPath } from "./pathfinding";

/** How close (pixels) the guard's feet must get to a path point to count as reaching it. */
const ARRIVE_DISTANCE = 1.5;

/**
 * Moves the guard's physics body along grid paths. Positions are the body's center (the feet).
 * The body still collides with walls, so even an imperfect path can never pass through one.
 */
export class GuardMover {
  private path: Vector[] = [];
  private speed = 0;

  constructor(
    private readonly body: Phaser.Physics.Arcade.Body,
    private readonly grid: LevelGrid,
  ) {}

  get position(): Vector {
    return { x: this.body.center.x, y: this.body.center.y };
  }

  /** True when there is nowhere left to go (destination reached, stopped, or unreachable). */
  get arrived(): boolean {
    return this.path.length === 0;
  }

  /** Direction of travel in radians, or null when standing still. */
  get heading(): number | null {
    const { x, y } = this.body.velocity;
    return x === 0 && y === 0 ? null : Math.atan2(y, x);
  }

  /** Plans a path to `target` and starts walking. Returns false (and stops) if it is unreachable. */
  goTo(target: Vector, speed: number): boolean {
    const tiles = findPath(this.grid.worldToTile(this.position), this.grid.worldToTile(target), this.grid.isWalkable);
    if (!tiles) {
      this.stop();
      return false;
    }
    this.path = tiles.map((tile) => this.grid.tileCenter(tile));
    // Finish at the exact point, which lies inside the goal tile (so this last step is safe).
    const last = this.path[this.path.length - 1] ?? this.position;
    if (distance(last, target) > ARRIVE_DISTANCE) this.path.push({ ...target });
    this.speed = speed;
    return true;
  }

  stop(): void {
    this.path = [];
    this.body.setVelocity(0, 0);
  }

  /** Call once per frame: steer toward the next path point. */
  update(): void {
    const position = this.position;
    while (this.path.length > 0 && distance(position, this.path[0]) <= ARRIVE_DISTANCE) this.path.shift();
    if (this.path.length === 0) {
      this.body.setVelocity(0, 0);
      return;
    }
    const next = this.path[0];
    const length = distance(position, next);
    this.body.setVelocity(((next.x - position.x) / length) * this.speed, ((next.y - position.y) / length) * this.speed);
  }
}
