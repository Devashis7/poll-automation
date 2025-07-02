import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";
import GlassCard from "../../components/GlassCard";
import GuestRecorder from "../../transcription/components/GuestRecorder";
import { getMicrophones, selectMicrophone } from "../../transcription/utils/micManager";

const GuestPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const meetingId = searchParams.get("meetingId") || "N/A";
  const displayName = searchParams.get("displayName") || "N/A";

  const [isMuted, setIsMuted] = useState(false);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [volumeLevel, setVolumeLevel] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const hostSocketRef = useRef<WebSocket | null>(null);

  const backendWsUrl = import.meta.env.VITE_BACKEND_WS_URL as string;

  useEffect(() => {
    const hostSocket = new WebSocket(`${backendWsUrl}/host-broadcast`);
    hostSocketRef.current = hostSocket;
    return () => hostSocket.close();
  }, [backendWsUrl]);

  useEffect(() => {
    getMicrophones().then((devices) => {
      setMicDevices(devices);
      if (devices[0]) handleMicChange(devices[0].deviceId);
    });
  }, []);

  const handleMicChange = async (deviceId: string) => {
    setSelectedMic(deviceId);
    await selectMicrophone(deviceId);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId } });
    streamRef.current = stream;

    setupAudioAnalysis(stream);
    setIsMuted(false);
  };

  const setupAudioAnalysis = (stream: MediaStream) => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
    }

    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;
    audioCtxRef.current = audioCtx;

    const updateVolume = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;
      analyserRef.current.getByteTimeDomainData(dataArrayRef.current);

      const norm = dataArrayRef.current.map(v => Math.abs(v - 128));
      const avg = norm.reduce((a, b) => a + b, 0) / norm.length;

      setVolumeLevel(Math.min(100, Math.floor((avg / 128) * 100)));
      requestAnimationFrame(updateVolume);
    };

    updateVolume();
  };

  const toggleMute = () => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsMuted((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <GlassCard className="p-8 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md">
          <div className="text-white flex flex-col items-center text-center gap-6">
            <h1 className="text-3xl font-bold">🎙️ Guest Voice Input</h1>

            <div className="space-y-2 text-sm sm:text-base">
              <p><span className="text-gray-400 font-medium">Meeting ID:</span> {meetingId}</p>
              <p><span className="text-gray-400 font-medium">Your Display ID:</span> {displayName}</p>
              <p><span className="text-gray-400 font-medium">Mic:</span> {isMuted ? <span className="text-red-400">Muted</span> : <span className="text-blue-400">Unmuted</span>}</p>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleMute}
              disabled={!streamRef.current}
              className={`flex items-center gap-2 ${isMuted ? "bg-gray-700 hover:bg-gray-600" : "bg-blue-600 hover:bg-blue-700"} text-white px-5 py-2 rounded-lg shadow disabled:opacity-50`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {isMuted ? "Unmute" : "Mute"}
            </motion.button>

            {/* Mic Selector */}
            <div className="w-full text-left mt-6">
              <label className="block text-sm text-gray-300 mb-1">Select Microphone</label>
              <select
                value={selectedMic}
                onChange={(e) => handleMicChange(e.target.value)}
                className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-600"
              >
                {micDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Mic ${device.deviceId}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Volume Bar */}
            <div className="w-full mt-4 text-sm text-gray-400">
              Volume Level: {volumeLevel*10}%
              <div className="w-full h-2 bg-gray-600 rounded mt-1">
                <div className="h-2 bg-green-500 rounded" style={{ width: `${volumeLevel*10}%` }} />
              </div>
            </div>

            {/* Guest Recorder
            {hostSocketRef.current && selectedMic && (
              <div className="mt-6 w-full">
                <GuestRecorder
                  guestId={displayName}
                  meetingId={meetingId}
                  backendWsUrl={`${backendWsUrl}/guest-stream`}
                  hostBroadcastSocket={hostSocketRef.current}
                />
              </div>
            )} */}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default GuestPage;
