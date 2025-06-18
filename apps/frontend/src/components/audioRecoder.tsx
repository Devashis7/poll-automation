import React, { useState, useRef, useEffect } from 'react';

// Define the shape of the MediaRecorder instance, adding a 'stream' property
interface CustomMediaRecorder extends MediaRecorder {
  stream: MediaStream; // Add stream property for easier access
}

const RecordToggle: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const mediaRecorderRef = useRef<CustomMediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]); // Temporary storage for current segment's chunks
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null); // To store the interval ID
  const [recordedSegments, setRecordedSegments] = useState<Blob[]>([]); // Stores all 30-second audio segments
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [segmentCount, setSegmentCount] = useState<number>(0);

  // --- Effect to check microphone permission on mount ---
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setPermissionGranted(true);
        // Immediately stop tracks to release the microphone after checking permission
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        setPermissionGranted(false);
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setError("Microphone access denied. Please allow microphone access in your browser settings to record.");
        } else if (err instanceof DOMException && err.name === "NotFoundError") {
          setError("No microphone found. Please connect a microphone.");
        } else {
          setError(`Error checking microphone permission: ${err}`);
        }
        console.error('Error checking microphone permission:', err);
      }
    };

    checkPermission();

    // Cleanup function for the effect
    return () => {
      // Ensure any active recording or interval is stopped if the component unmounts
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, []);

  // --- Function to process and store a completed segment ---
  const processSegment = (): void => {
    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      setRecordedSegments((prevSegments) => [...prevSegments, audioBlob]);
      console.log(`Segment ${segmentCount + 1} recorded:`, audioBlob);
      setSegmentCount((prevCount) => prevCount + 1);
    }
    // Always clear chunks for the next segment
    audioChunksRef.current = [];
  };

  // --- Function to start recording a new segment ---
  const startRecordingSegment = async (): Promise<void> => {
    setError(null); // Clear previous errors
    try {
      const stream: MediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream) as CustomMediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        audioChunksRef.current.push(event.data);
      };

      // When a segment stops (due to `stop()` call or interval), process it
      mediaRecorder.onstop = () => {
        processSegment();
        // Crucially, stop the stream tracks *after* processing to ensure all data is received
        // Only stop if the component is not intending to restart for a new segment immediately
        if (!isRecording) { // If isRecording is false, it means we fully stopped, not just segmenting
          mediaRecorder.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        }
      };

      mediaRecorderRef.current = mediaRecorder; // Store the MediaRecorder instance
      mediaRecorder.start();
      console.log('Recording segment started...');
    } catch (err: any) {
      handleMicrophoneError(err);
      setIsRecording(false); // Ensure state is false if recording couldn't start
    }
  };

  // --- Function to handle microphone errors ---
  const handleMicrophoneError = (err: any): void => {
    if (err instanceof DOMException && err.name === "NotAllowedError") {
      setError("Microphone access denied. Please allow microphone access in your browser settings to record.");
    } else if (err instanceof DOMException && err.name === "NotFoundError") {
      setError("No microphone found. Please connect a microphone.");
    } else {
      setError(`Error starting recording: ${err.message || err}`);
    }
    console.error('Recording error:', err);
  };

  // --- Main function to toggle recording ---
  const toggleRecording = async (): Promise<void> => {
    if (isRecording) {
      // If currently recording, stop everything
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop(); // This will trigger onstop, which calls processSegment()
        // The stream tracks will be stopped inside onstop if not restarting
      }
      setIsRecording(false);
      console.log('Recording fully stopped.');
    } else {
      // If not recording, start the first segment
      await startRecordingSegment();
      setIsRecording(true);
      setSegmentCount(0); // Reset segment count for new recording session

      // Set up the interval to stop and restart recording every 30 seconds
      intervalIdRef.current = setInterval(async () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          // Stop the current segment, which triggers `onstop` and `processSegment`
          mediaRecorderRef.current.stop();
          // It's crucial to stop the tracks of the old stream immediately
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

          // Start a new segment
          await startRecordingSegment();
        }
      }, 30 * 1000); // 30 seconds
      console.log('Recording session started. New segment every 30 seconds.');
    }
  };

  // --- Rendered component ---
  if (permissionGranted === null) {
    return <p>Checking microphone permission...</p>;
  }

  return (
    <div>
      <button
        onClick={toggleRecording}
        disabled={!permissionGranted && !isRecording} // Disable if no permission and not currently recording
        style={{
          padding: '10px 20px',
          fontSize: '18px',
          cursor: permissionGranted ? 'pointer' : 'not-allowed',
          backgroundColor: isRecording ? '#ff4d4d' : (permissionGranted ? '#4CAF50' : '#cccccc'), // Red/Green/Grey
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          transition: 'background-color 0.3s ease',
        }}
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>

      {isRecording && (
        <p style={{ color: 'red', marginTop: '10px' }}>
          Recording in progress... Segment: {segmentCount + 1}
        </p>
      )}
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      {!permissionGranted && permissionGranted !== null && !error && (
        <p style={{ color: 'orange', marginTop: '10px' }}>
          Microphone access not granted. Please allow access to record.
        </p>
      )}

      {/* Display a list of recorded segments (optional) */}
      {recordedSegments.length > 0 && (
        <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
          <h3>Recorded Segments:</h3>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {recordedSegments.map((segmentBlob, index) => (
              <li key={index} style={{ marginBottom: '5px' }}>
                Segment {index + 1}: ({Math.round(segmentBlob.size / 1024)} KB)
                {/* Example: Offer a download link for each segment */}
                <a
                  href={URL.createObjectURL(segmentBlob)}
                  download={`recording-segment-${index + 1}.wav`}
                  style={{ marginLeft: '10px', textDecoration: 'none', color: '#007bff' }}
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RecordToggle;