import React from 'react';
import { ShieldAlert, Users, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const mockStudents = [
    { id: 1, name: "Alice Johnson", status: "Active", warnings: 0, image: "https://i.pravatar.cc/150?u=1" },
    { id: 2, name: "Bob Smith", status: "Warning", warnings: 2, image: "https://i.pravatar.cc/150?u=2" },
    { id: 3, name: "Charlie Davis", status: "Critical", warnings: 4, image: "https://i.pravatar.cc/150?u=3" }
  ];

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-200 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Instructor Dashboard
        </h1>
        <div className="flex gap-4">
          <div className="glass-card px-4 py-2 rounded-lg flex items-center gap-2">
            <Users className="text-blue-400 w-5 h-5" />
            <span>42 Active Sessions</span>
          </div>
          <div className="glass-card px-4 py-2 rounded-lg flex items-center gap-2">
            <ShieldAlert className="text-red-400 w-5 h-5" />
            <span className="text-red-400">3 Alerts</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {mockStudents.map((student, i) => (
          <motion.div 
            key={student.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`glass-card rounded-xl p-4 border ${student.status === 'Critical' ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : student.status === 'Warning' ? 'border-yellow-500/50' : 'border-white/10'}`}
          >
            <div className="relative mb-4 rounded-lg overflow-hidden h-40">
              <img src={student.image} alt={student.name} className="w-full h-full object-cover opacity-80" />
              <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 backdrop-blur text-xs rounded font-semibold text-white flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" /> LIVE
              </div>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <h3 className="font-semibold text-white">{student.name}</h3>
                <p className="text-sm text-slate-400">ID: STU-00{student.id}</p>
              </div>
              <div className="text-right">
                <span className={`text-xl font-bold ${student.warnings > 2 ? 'text-red-400' : student.warnings > 0 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                  {student.warnings}
                </span>
                <p className="text-xs text-slate-400">Warnings</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
