// Runs on the audio render thread (not main thread) so mic capture never causes UI jank. Downsamples
// whatever the browser's native mic rate is down to 16kHz mono PCM16 — the format the Deepgram
// relay expects — and posts each chunk back to the main thread to forward over the WebSocket.
class PCMDownsamplerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleRate = 16000;
    this.buffer = [];
    this.bufferedSamples = 0;
    // ~100ms chunks at 16kHz = 1600 samples — frequent enough to feel real-time, not so frequent
    // that per-message overhead dominates.
    this.chunkSize = 1600;
  }

  downsample(float32Array) {
    const ratio = sampleRate / this.targetSampleRate; // `sampleRate` is a global in AudioWorkletGlobalScope
    const newLength = Math.round(float32Array.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const idx0 = Math.floor(srcIndex);
      const idx1 = Math.min(idx0 + 1, float32Array.length - 1);
      const frac = srcIndex - idx0;
      result[i] = float32Array[idx0] * (1 - frac) + float32Array[idx1] * frac;
    }
    return result;
  }

  floatTo16BitPCM(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];

    const downsampled = this.downsample(channel);
    this.buffer.push(downsampled);
    this.bufferedSamples += downsampled.length;

    if (this.bufferedSamples >= this.chunkSize) {
      const merged = new Float32Array(this.bufferedSamples);
      let offset = 0;
      for (const chunk of this.buffer) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      const pcm = this.floatTo16BitPCM(merged);
      this.port.postMessage(pcm, [pcm]); // transfer, not copy
      this.buffer = [];
      this.bufferedSamples = 0;
    }

    return true;
  }
}

registerProcessor('pcm-downsampler', PCMDownsamplerProcessor);
