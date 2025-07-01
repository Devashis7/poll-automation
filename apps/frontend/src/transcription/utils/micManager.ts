let currentStream: MediaStream | null = null;
let currentTrack: MediaStreamTrack | null = null;
let audioContext: AudioContext | null = null;
let gainNode: GainNode | null = null;

/**
 * Returns a list of available audio input devices (microphones).
 */
export async function getMicrophones(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'audioinput');
}

/**
 * Selects a microphone by deviceId and updates the current stream and track.
 */
export async function selectMicrophone(deviceId: string): Promise<MediaStream | null> {
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { deviceId: { exact: deviceId } }
  });

  currentStream = stream;
  currentTrack = stream.getAudioTracks()[0];

  if (audioContext) {
    audioContext.close();
  }

  audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  gainNode = audioContext.createGain();
  source.connect(gainNode).connect(audioContext.destination);

  return stream;
}

/**
 * Toggles mute on the current audio track.
 */
export function toggleMute(): void {
  if (currentTrack) {
    currentTrack.enabled = !currentTrack.enabled;
  }
}

/**
 * Sets the microphone input volume using Web Audio API.
 */
export function setVolume(value: number): void {
  if (gainNode) {
    gainNode.gain.value = value;
  }
}
