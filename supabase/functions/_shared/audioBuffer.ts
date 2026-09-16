/** Keep at most ten seconds of 16 kHz mono PCM while a provider connects. */
export class AudioBuffer {
  private frames: (string | ArrayBuffer | Blob | ArrayBufferView)[] = [];
  private bytes = 0;
  constructor(private readonly maxBytes = 320_000) {}
  push(frame: string | ArrayBuffer | Blob | ArrayBufferView): boolean {
    const size =
      typeof frame === "string"
        ? new TextEncoder().encode(frame).byteLength
        : frame instanceof Blob
          ? frame.size
          : frame.byteLength;
    if (size > this.maxBytes - this.bytes) return false;
    this.frames.push(frame);
    this.bytes += size;
    return true;
  }
  drain(send: (frame: string | ArrayBuffer | Blob | ArrayBufferView) => void) {
    const frames = this.frames;
    this.clear();
    frames.forEach(send);
  }
  clear() {
    this.frames = [];
    this.bytes = 0;
  }
}
