import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import StudentExam from './components/StudentExam';
import AdminDashboard from './components/AdminDashboard';
import { ShieldCheck } from 'lucide-react';

function Landing() {
  return (
    <div className="min-h-screen bg-[#0b0e14] text-white flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      
      <ShieldCheck className="w-20 h-20 text-blue-400 mb-6" />
      <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
        Academic Sanctuary
      </h1>
      <p className="text-slate-400 mb-12 text-lg max-w-lg text-center">
        The ultimate AI-proctored examination portal equipped with MediaPipe and WebAudio security.
      </p>
      
      <div className="flex gap-6">
        <Link to="/exam" className="glass-card neon-border px-8 py-3 rounded-lg font-semibold hover:bg-blue-600/20 transition">
          Enter as Student
        </Link>
        <Link to="/admin" className="glass-card px-8 py-3 rounded-lg font-semibold hover:bg-purple-600/20 transition border border-purple-500/30">
          Enter Console
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/exam" element={<StudentExam />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
