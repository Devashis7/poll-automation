import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Volume2, Activity, Pause, Play } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import GlassCard from '../components/GlassCard';
import GuestLinkGenerator from '../components/host/GuestLinkGenerator';
import { Toaster } from 'react-hot-toast';
import { getMicrophones } from '../transcription/utils/micManager';
import { encodeWAV } from '../transcription/utils/wavEncoder';

const AudioCapture = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [selectedMic, setSelectedMic] = useState(() => localStorage.getItem('selectedMic') || 'default');
  const [micDevices, setMicDevices] = useState<{ id: string; name: string }[]>([]);
  const [downloaded, setDownloaded] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>(Array(50).fill(0));

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const pausedRef = useRef<boolean>(false);

  useEffect(() => {
    const fetchMicrophones = async () => {
      const devices = await getMicrophones();
      const formatted = devices.map((device) => ({
        id: device.deviceId,
        name: device.label || `Microphone (${device.deviceId.slice(0, 5)})`
      }));
      setMicDevices(formatted);

      if (!formatted.some(d => d.id === selectedMic)) {
        setSelectedMic('default');
      }
    };

    fetchMicrophones();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedMic === 'default' ? true : { deviceId: { exact: selectedMic } }
      });

      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!pausedRef.current) {
          const input = e.inputBuffer.getChannelData(0);
          audioBufferRef.current.push(new Float32Array(input));

          // Visualize waveform
          const avg = input.reduce((a, b) => a + Math.abs(b), 0) / input.length;
          const newWave = waveformData.map(() => Math.random() * avg * 100);
          setWaveformData(newWave);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      const ws = new WebSocket(import.meta.env.VITE_BACKEND_WS_URL as string);
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: "start",
          guestId: "host",
          meetingId: "yourRoomCodeHere"
        }));

        setInterval(() => {
          if (audioBufferRef.current.length === 0) return;

          const merged = mergeBuffers(audioBufferRef.current);
          const wav = encodeWAV(merged, 16000);
          ws.send(wav);
          audioBufferRef.current = [];
        }, 3000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "transcription") {
            setTranscription(prev => prev + ' ' + data.text);
          }
        } catch (e) {
          console.error("Invalid JSON from backend:", event.data);
        }
      };

      socketRef.current = ws;
      audioContextRef.current = audioContext;
      scriptNodeRef.current = processor;
      setIsRecording(true);
    } catch (err) {
      console.error("🎙️ Mic access error", err);
    }
  };

  const stopRecording = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.close();
    }
    audioBufferRef.current = [];
    setIsRecording(false);
    setIsPaused(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const togglePause = () => {
    setIsPaused(prev => {
      pausedRef.current = !prev;
      return !prev;
    });
  };

  const clearTranscription = () => {
    setTranscription('');
  };

  const downloadTranscript = () => {
    const blob = new Blob([transcription], { type: 'text/plain' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `transcript-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const mergeBuffers = (chunks: Float32Array[]) => {
    const length = chunks.reduce((acc, cur) => acc + cur.length, 0);
    const result = new Float32Array(length);
    let offset = 0;
    for (let chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  };
  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 "
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Audio Capture</h1>
            <p className="text-gray-400">Real-time audio recording and transcription</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${isRecording
              ? isPaused
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-green-500/20 text-green-400'
              : 'bg-gray-500/20 text-gray-400'
              }`}>
              {isRecording ? (isPaused ? 'Paused' : 'Recording') : 'Stopped'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recording Controls */}
          <GlassCard className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Recording Controls</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleRecording}
                  className={`w-20 h-20 rounded-full flex items-center justify-center ${isRecording
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-primary-500 hover:bg-primary-600'
                    } transition-colors duration-200`}
                >
                  {isRecording ? (
                    <MicOff className="w-8 h-8 text-white" />
                  ) : (
                    <Mic className="w-8 h-8 text-white" />
                  )}
                </motion.button>
              </div>

              <div className="flex items-center justify-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={togglePause}
                  disabled={!isRecording}
                  className="px-4 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isPaused ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <Pause className="w-4 h-4" />
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={clearTranscription}
                  className="px-4 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors duration-200"
                >
                  Clear Transcript
                </motion.button>
              </div>
            </div>
          </GlassCard>

          {/* Microphone Settings */}
          <GlassCard className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Microphone Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Microphone
                </label>
                <select
        value={selectedMic}
        onChange={(e) => {
          setSelectedMic(e.target.value);
          localStorage.setItem('selectedMic', e.target.value);
        }}
        className="w-full bg-white/10 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="default" className="bg-gray-800">Default Microphone</option>
        {micDevices.length > 0 ? (
          micDevices.map(device => (
            <option key={device.id} value={device.id} className="bg-gray-800">
              {device.name}
            </option>
          ))
        ) : (
          <option disabled className="bg-gray-800">No microphone devices found</option>
        )}
      </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Volume Level
                </label>
                <div className="flex items-center space-x-3">
                  <Volume2 className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div className="bg-primary-500 rounded-full h-2 w-3/4" />
                  </div>
                  <span className="text-sm text-gray-400">75%</span>
                </div>
              </div>
            </div>
          </GlassCard>


          {/* Waveform Visualizer
          <GlassCard className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Audio Waveform</h3>
            <div className="bg-black/20 rounded-lg p-4 h-32 flex items-end justify-center space-x-1">
              {waveformData.map((height, index) => (
                <motion.div
                  key={index}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.1 }}
                  className="bg-gradient-to-t from-primary-500 to-secondary-500 w-2 rounded-t-sm min-h-[2px]"
                />
              ))}
            </div>
          </GlassCard> */}
        </div>
        {/* Generate Guest Link Button */}
        <div>
          <Toaster position="top-right" reverseOrder={false} />
          <GuestLinkGenerator meetingId="yourRoomCodeHere" />
        </div>

        {/* Transcription Output */}
        <GlassCard className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h3 className="text-xl font-bold text-white">Real-time Transcription</h3>
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-primary-400" />
              <span className="text-sm text-gray-400">Live</span>
            </div>
          </div>
          <div className="bg-black/20 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
            {transcription ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-gray-300 leading-relaxed"
              >
                {transcription}
              </motion.p>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 text-center">
                  {isRecording
                    ? 'Listening for speech...'
                    : 'Click the microphone to start recording'
                  }
                </p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={downloadTranscript}
            disabled={!transcription}
            className="px-6 py-3 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export Transcript
          </motion.button>
        </div>
      </motion.div>
      {downloaded && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50"
        >
          Transcript downloaded!
        </motion.div>
      )}
    </DashboardLayout>
  );
};

export default AudioCapture;
