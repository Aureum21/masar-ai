/** Resolution control uses sustained visible frames, never background-tab throttling. */
export class FrameBudget {
  public scale = 1;
  public fps = 0;
  private elapsed = 0;
  private frames = 0;
  private slowWindows = 0;
  private fastWindows = 0;

  sample(seconds: number, visible: boolean): boolean {
    if (!visible || seconds <= 0 || seconds > 0.5) {
      this.elapsed = this.frames = this.slowWindows = this.fastWindows = 0;
      return false;
    }
    this.elapsed += seconds;
    this.frames++;
    if (this.elapsed < 1) return false;
    this.fps = Math.round(this.frames / this.elapsed);
    this.elapsed = this.frames = 0;
    this.slowWindows = this.fps < 55 ? this.slowWindows + 1 : 0;
    this.fastWindows = this.fps >= 58 ? this.fastWindows + 1 : 0;
    const previous = this.scale;
    if (this.slowWindows >= 2) {
      this.scale = Math.max(0.6, Math.round((this.scale - 0.1) * 10) / 10);
      this.slowWindows = 0;
    } else if (this.fastWindows >= 8) {
      this.scale = Math.min(1, Math.round((this.scale + 0.1) * 10) / 10);
      this.fastWindows = 0;
    }
    return previous !== this.scale;
  }
}

export function renderPixelRatio(width: number, height: number, deviceRatio: number, scale: number): number {
  // A 4K/retina screen must not silently quadruple the game's fragment workload.
  return Math.min(deviceRatio, 1, Math.sqrt(900_000 / Math.max(1, width * height))) * scale;
}

export function sharpPixelRatio(width: number, height: number, deviceRatio: number): number {
  return Math.min(deviceRatio, 1.25, Math.sqrt(1_400_000 / Math.max(1, width * height)));
}
