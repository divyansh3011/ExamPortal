import { useState, useEffect, useRef, useCallback } from 'react';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

export function useProctoring() {
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [warnings, setWarnings] = useState([]);
  
  const videoRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const landmarkerRef = useRef(null);
  
  const lastFaceTime = useRef(Date.now());
  const lookingAwayTime = useRef(0);
  const speakingTime = useRef(0);
  const warningCount = useRef(0);
  
  const addWarning = useCallback((message, type) => {
    setWarnings(prev => [...prev, { id: Date.now(), message, type }]);
    warningCount.current += 1;
    console.log("[Proctoring Alert]", message);
  }, []);

  const initializeAI = async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 2
      });
      console.log("AI Landmarker initialized");
    } catch (e) {
      console.error("Failed to initialize Mediapipe", e);
    }
  };

  const startProctoring = async () => {
    await initializeAI();
    try {
      // 1. Camera Access
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setMicActive(true);
      
      // 2. Audio Processing Setup
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      requestAnimationFrame(processFrame);
    } catch (err) {
      console.error("Permission denied", err);
      addWarning("Camera or Microphone permission denied.", "CRITICAL");
    }
  };

  const processFrame = () => {
    if (!videoRef.current || !landmarkerRef.current) return;
    
    const now = performance.now();
    
    // --- AUDIO CHECK ---
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const averageVolume = sum / dataArray.length;
      
      if (averageVolume > 20) { // arbitrary threshold
        speakingTime.current += 1;
        if (speakingTime.current > 100) { // ~ 3 seconds at 60fps
          addWarning("Talking detected. Please maintain exam discipline.", "AUDIO");
          speakingTime.current = 0;
        }
      } else {
        speakingTime.current = Math.max(0, speakingTime.current - 1);
      }
    }

    // --- VIDEO CHECK ---
    if (videoRef.current.readyState >= 2) {
      const results = landmarkerRef.current.detectForVideo(videoRef.current, now);
      const faces = results.faceLandmarks;
      
      if (!faces || faces.length === 0) {
        if (Date.now() - lastFaceTime.current > 3000) {
          addWarning("Face not detected. Please stay in front of the screen.", "FACE_MISSING");
          lastFaceTime.current = Date.now(); // reset to avoid spam
        }
      } else {
        lastFaceTime.current = Date.now();
        if (faces.length > 1) {
          addWarning("Multiple people detected.", "MULTI_PERSON");
        } else {
          // Check Head Movement (Yaw/Pitch approx via eye/nose points)
          const nose = faces[0][1];
          const leftEye = faces[0][33];
          const rightEye = faces[0][263];
          
          // Basic horizontal gaze estimation
          const faceCenterX = (leftEye.x + rightEye.x) / 2;
          const offset = Math.abs(nose.x - faceCenterX);
          
          if (offset > 0.05) { // Looking away threshold
            lookingAwayTime.current += 1;
            if (lookingAwayTime.current > 150) { // ~3 seconds at 60 fps
              addWarning("Suspicious head movement detected.", "HEAD_MOVEMENT");
              lookingAwayTime.current = 0;
            }
          } else {
            lookingAwayTime.current = Math.max(0, lookingAwayTime.current - 2);
          }
        }
      }
    }
    
    requestAnimationFrame(processFrame);
  };

  const dismissWarning = (id) => {
    setWarnings(prev => prev.filter(w => w.id !== id));
  };

  return { videoRef, cameraActive, micActive, warnings, startProctoring, dismissWarning };
}
