import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProctoring } from '../useProctoring';
import { AlertCircle, Maximize, Clock, ShieldCheck } from 'lucide-react';

export default function StudentExam() {
  const { videoRef, warnings, startProctoring, dismissWarning } = useProctoring();
  const [examStarted, setExamStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour

  useEffect(() => {
    if (examStarted) {
      startProctoring();
      const timer = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [examStarted]);

  const requestFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  };

  const handleStart = () => {
    requestFullscreen();
    setExamStarted(true);
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-200 p-6 relative overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Layout */}
      {!examStarted ? (
        <div className="flex items-center justify-center h-[80vh]">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-10 rounded-2xl max-w-md text-center"
          >
            <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-blue-400" />
            <h2 className="text-3xl font-bold text-white mb-2">Secure Exam Portal</h2>
            <p className="text-slate-400 mb-8">This exam is AI-proctored. Be prepared to share your camera and microphone.</p>
            <button 
              onClick={handleStart}
              className="w-full neon-border bg-blue-600 hover:bg-blue-500 transition-colors py-3 px-6 rounded-lg font-semibold text-white tracking-wide"
            >
              Begin Examination
            </button>
          </motion.div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[90vh]">
          {/* Main Exam Area */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Header */}
            <div className="glass-card p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-emerald-400" />
                <span className="font-semibold text-emerald-400 tracking-wider text-sm">MONITORING ACTIVE</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-4 h-4" />
                  <span className="font-mono text-lg">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
                </div>
                <button onClick={requestFullscreen} className="p-2 hover:bg-white/10 rounded-lg transition">
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Questions Container */}
            <div className="glass-card flex-1 rounded-xl p-8">
              <h3 className="text-sm font-semibold text-blue-400 tracking-widest mb-4">QUESTION 1</h3>
              <h2 className="text-2xl font-semibold text-white mb-6">Describe the architectural differences between React and Vanilla JS.</h2>
              <textarea 
                className="w-full h-64 bg-black/30 border border-white/10 rounded-lg p-4 text-slate-200 outline-none focus:border-blue-500 transition"
                placeholder="Type your answer here..."
              ></textarea>
            </div>
          </div>

          {/* Sidebar / Proctoring View */}
          <div className="flex flex-col gap-6">
            <div className="glass-card rounded-xl p-4 flex flex-col relative overflow-hidden h-64">
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-semibold bg-black/50 px-2 py-1 rounded">LIVE</span>
              </div>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
            </div>
            
            <div className="glass-card flex-1 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4">Exam Guidelines</h3>
              <ul className="text-sm text-slate-400 space-y-3">
                <li>• Maintain eye contact with the screen</li>
                <li>• Ensure your face is clearly visible</li>
                <li>• Keep your microphone unmuted</li>
                <li>• Do not leave the fullscreen mode</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modals */}
      <AnimatePresence>
        {warnings.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-red-500/30 p-8 rounded-2xl max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.2)] text-center relative"
            >
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Warning Recorded</h3>
              <p className="text-slate-300 mb-6">{warnings[warnings.length - 1].message}</p>
              <button 
                onClick={() => dismissWarning(warnings[warnings.length - 1].id)}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-6 rounded-lg transition"
              >
                I Understand
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
