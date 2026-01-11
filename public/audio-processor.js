/**
 * AudioWorklet processor for extracting raw audio samples in real-time.
 * This processor captures audio samples from the microphone input and
 * sends them to the main thread for live transcription.
 *
 * The processor accumulates samples into batches to reduce IPC overhead
 * while maintaining low latency for real-time transcription.
 */

class AudioSampleProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Buffer to accumulate samples before sending
    // At 16kHz, 1600 samples = 100ms of audio
    this.buffer = [];
    this.bufferSize = 1600; // ~100ms at 16kHz
    this.isRunning = true;

    // Handle messages from main thread
    this.port.onmessage = (event) => {
      if (event.data.command === 'stop') {
        this.isRunning = false;
        // Flush any remaining samples
        if (this.buffer.length > 0) {
          this.port.postMessage({
            type: 'samples',
            samples: new Float32Array(this.buffer),
            sampleCount: this.buffer.length,
          });
          this.buffer = [];
        }
        this.port.postMessage({ type: 'stopped' });
      }
    };
  }

  process(inputs, outputs, parameters) {
    if (!this.isRunning) {
      return false; // Stop processing
    }

    const input = inputs[0];
    if (!input || input.length === 0) {
      return true; // Continue but no input
    }

    // Get the first channel (mono)
    const channelData = input[0];
    if (!channelData || channelData.length === 0) {
      return true;
    }

    // Add samples to buffer
    for (let i = 0; i < channelData.length; i++) {
      this.buffer.push(channelData[i]);
    }

    // Send buffer when full
    while (this.buffer.length >= this.bufferSize) {
      const samplesToSend = this.buffer.splice(0, this.bufferSize);
      this.port.postMessage({
        type: 'samples',
        samples: new Float32Array(samplesToSend),
        sampleCount: samplesToSend.length,
      });
    }

    return true; // Keep processor alive
  }
}

registerProcessor('audio-sample-processor', AudioSampleProcessor);
