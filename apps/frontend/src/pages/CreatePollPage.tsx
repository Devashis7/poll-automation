"use client"

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, Upload, Users, Mail, FileText, AlertCircle, X, Eye, EyeOff, RefreshCw, Clock, Play, Plus, Trash2 } from "lucide-react";
import GlassCard from "../components/GlassCard";
import DashboardLayout from "../components/DashboardLayout";
import * as XLSX from "xlsx";

interface StudentInvite {
  name: string;
  email: string;
}

const POLL_STORAGE_KEY = "activePollSession";

const CreatePollPage = () => {
  const [roomCode, setRoomCode] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [students, setStudents] = useState<StudentInvite[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [isDestroying, setIsDestroying] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<{ csv?: string }>({});
  const [isPollActive, setIsPollActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(3 * 60 * 60);
  const [invitesSent, setInvitesSent] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomNameError, setRoomNameError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(POLL_STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.isPollActive) {
          setRoomCode(data.roomCode || "");
          setRoomName(data.roomName || "");
          setTimeRemaining(data.timeRemaining || 3 * 60 * 60);
          setIsPollActive(true);
        } else {
          setRoomCode(generateRoomCode());
        }
      } catch {
        setRoomCode(generateRoomCode());
      }
    } else {
      setRoomCode(generateRoomCode());
    }
  }, []);

  useEffect(() => {
    if (isPollActive) {
      localStorage.setItem(
        POLL_STORAGE_KEY,
        JSON.stringify({
          roomCode,
          roomName,
          timeRemaining,
          isPollActive: true,
        })
      );
    } else {
      localStorage.removeItem(POLL_STORAGE_KEY);
    }
  }, [isPollActive, roomCode, roomName, timeRemaining]);

  // Fixed generateRoomCode function
 const generateRoomCode = (): string => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 6 }, () =>
    characters.charAt(Math.floor(Math.random() * characters.length))
  ).join('');
};


  const handleRegenerateCode = () => {
    if (!isPollActive) {
      setRoomCode(generateRoomCode());
    }
  };

  const handleDestroyRoom = () => {
    setIsDestroying(true);
    setTimeout(() => {
      setIsPollActive(false);
      setTimeRemaining(3 * 60 * 60);
      setRoomCode(generateRoomCode());
      setIsDestroying(false);
      localStorage.removeItem(POLL_STORAGE_KEY);
    }, 1500);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [hours, minutes, secs]
      .map(v => v.toString().padStart(2, "0"))
      .join(":");
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPollActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev > 0 ? prev - 1 : 0);
        if (timeRemaining <= 1) setIsPollActive(false);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPollActive, timeRemaining]);

  const handleExtendTime = (hours: number) => {
    setTimeRemaining(prev => prev + hours * 60 * 60);
  };

  const parseCSV = (content: string): StudentInvite[] => {
    const lines = content.split("\n").filter(line => line.trim());
    const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
    
    const emailIndex = headers.findIndex(h => h.includes("email"));
    const nameIndex = headers.findIndex(h => h.includes("name"));
    
    if (emailIndex === -1) throw new Error("CSV must contain an 'email' column");

    return lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim());
      return {
        name: nameIndex !== -1 ? values[nameIndex] || "Student" : "Student",
        email: values[emailIndex] || ""
      };
    }).filter(student => student.email);
  };

  const handleFileUpload = useCallback(async (file: File) => {
    const validTypes = [".csv", ".xls", ".xlsx"];
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    
    if (!validTypes.includes(extension)) {
      setErrors({ csv: "Please upload a .csv or .xls/.xlsx file" });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      let parsedStudents: StudentInvite[] = [];
      
      if (extension === ".csv") {
        const content = await file.text();
        parsedStudents = parseCSV(content);
      } else {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        const headers = rows[0].map(h => String(h).toLowerCase().trim());
        const emailIndex = headers.findIndex(h => h.includes("email"));
        const nameIndex = headers.findIndex(h => h.includes("name"));
        
        if (emailIndex === -1) throw new Error("File must contain an 'email' column");
        
        parsedStudents = rows.slice(1)
          .filter(row => row[emailIndex])
          .map(row => ({
            name: nameIndex !== -1 ? String(row[nameIndex] || "Student").trim() : "Student",
            email: String(row[emailIndex]).trim()
          }));
      }

      if (parsedStudents.length === 0) {
        throw new Error("No valid student records found");
      }

      setStudents(parsedStudents);
      setCsvFile(file);
      setShowPreview(true);
    } catch (error: any) {
      setErrors({ 
        csv: error.message || "Failed to parse the file" 
      });
      setStudents([]);
      setCsvFile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, [handleFileUpload]);

  const handleSendInvites = async () => {
    if (!csvFile || students.length === 0) return;

    setIsSendingInvites(true);
    setErrors({});

    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      formData.append("roomCode", roomCode);

      const res = await fetch("http://localhost:5001/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      
      if (res.ok) {
        setInvitesSent(true);
      } else {
        setErrors({ csv: result.error || "Failed to send invites" });
      }
    } catch (err) {
      setErrors({ csv: "Network error while sending invites" });
    } finally {
      setIsSendingInvites(false);
    }
  };

  const handleCreatePoll = () => {
    if (!roomName.trim()) {
      setRoomNameError("Room Name is required");
      return;
    }
    setRoomNameError("");
    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      setIsPollActive(true);
    }, 2000);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Create A New Poll Session
            </h1>
            <p className="text-gray-400 text-lg">
              Set up your room code and optionally invite students
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Room Code Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <GlassCard className="p-6 sm:p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <Hash className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Room Code</h2>
                  {isPollActive && (
                    <div className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                      ACTIVE
                    </div>
                  )}
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Room Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={e => {
                      setRoomName(e.target.value);
                      if (e.target.value.trim()) setRoomNameError("");
                    }}
                    placeholder="Enter a room name (e.g. Math Quiz, Science Poll)"
                    className={`w-full px-4 py-2 bg-white/5 border ${
                      roomNameError ? "border-red-500" : "border-white/10"
                    } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition`}
                    maxLength={50}
                    required
                  />
                  {roomNameError && (
                    <p className="text-red-400 text-xs mt-1">{roomNameError}</p>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className={`w-full px-4 py-6 bg-white/5 border rounded-lg text-center transition-all duration-300 ${
                    isPollActive 
                      ? "border-green-500/30 bg-green-500/5" 
                      : "border-white/10"
                  }`}>
                    <div className="text-3xl font-bold text-white tracking-wider mb-2">
                      {roomCode}
                    </div>
                    {roomName && (
                      <p className="text-primary-400 text-base font-semibold mt-2">
                        {roomName}
                      </p>
                    )}
                    <p className="text-gray-400 text-sm">
                      Share this code with participants
                    </p>
                  </div>

                  <div className="flex justify-center space-x-3">
                    <motion.button
                      whileHover={!isPollActive ? { scale: 1.05 } : {}}
                      whileTap={!isPollActive ? { scale: 0.95 } : {}}
                      onClick={handleRegenerateCode}
                      disabled={isPollActive}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                        isPollActive
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:shadow-lg"
                      }`}
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>{isPollActive ? "Code Locked" : "Generate New Code"}</span>
                    </motion.button>

                    <AnimatePresence>
                      {isPollActive && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleDestroyRoom}
                          disabled={isDestroying}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                            isDestroying
                              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                              : "bg-gradient-to-r from-red-500 to-pink-500 text-white hover:shadow-lg"
                          }`}
                        >
                          {isDestroying ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Destroying...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
                              <span>Destroy Room</span>
                            </>
                          )}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10">
                  <motion.button
                    whileHover={!isPollActive ? { scale: 1.02 } : {}}
                    whileTap={!isPollActive ? { scale: 0.98 } : {}}
                    onClick={handleCreatePoll}
                    disabled={isPollActive || isLoading}
                    className={`w-full px-6 py-4 rounded-lg font-semibold text-lg transition-all duration-200 ${
                      isPollActive
                        ? "bg-green-600 text-white cursor-default"
                        : isLoading
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-xl"
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Creating Poll...</span>
                      </div>
                    ) : isPollActive ? (
                      <div className="flex items-center justify-center space-x-2">
                        <Play className="w-5 h-5" />
                        <span>Poll Session Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <Play className="w-5 h-5" />
                        <span>Create Poll Session</span>
                      </div>
                    )}
                  </motion.button>
                </div>
              </GlassCard>
            </motion.div>

            {/* Invite Students Section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <GlassCard className="p-6 sm:p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Invite Students</h2>
                  <div className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                    OPTIONAL
                  </div>
                </div>

                <div className="space-y-4">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                      isDragOver
                        ? "border-primary-500/50 bg-primary-500/10"
                        : errors.csv
                          ? "border-red-500/50 bg-red-500/5"
                          : "border-white/20 hover:border-white/30"
                    }`}
                  >
                    <input
                      type="file"
                      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-4">
                      <motion.div animate={{ scale: isDragOver ? 1.1 : 1 }}>
                        <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                      </motion.div>
                      <div>
                        <p className="text-white font-medium">
                          {isDragOver ? "Drop your CSV file here" : "Drag & drop your CSV or Excel file"}
                        </p>
                        <p className="text-gray-400 text-sm mt-1">or click to browse files</p>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {errors.csv && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center space-x-2 text-red-400 text-sm"
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span>{errors.csv}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {csvFile && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-green-400" />
                          <div>
                            <p className="text-white text-sm font-medium">{csvFile.name}</p>
                            <p className="text-gray-400 text-xs">{students.length} students found</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setCsvFile(null);
                            setStudents([]);
                            setShowPreview(false);
                          }} 
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center space-x-2 text-gray-400 text-sm">
                    <FileText className="w-4 h-4" />
                    <span>CSV must contain 'email' column (optional: 'name' column)</span>
                  </div>

                  {/* Email Preview */}
                  {csvFile && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-400 mb-2">
                        Sample invitation content:
                      </p>
                      <div className="bg-white/5 p-4 rounded-lg text-sm">
                        <p className="text-white">Subject: Poll Session Invitation</p>
                        <p className="mt-2">Hi [Student Name],</p>
                        <p>You've been invited to join our poll session!</p>
                        <p className="mt-2">
                          <strong>Room Code:</strong> {roomCode}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {students.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-6 pt-6 border-t border-white/10"
                    >
                      <motion.button
                        whileHover={!invitesSent ? { scale: 1.02 } : {}}
                        whileTap={!invitesSent ? { scale: 0.98 } : {}}
                        onClick={handleSendInvites}
                        disabled={invitesSent || isSendingInvites}
                        className={`w-full px-6 py-4 rounded-lg font-semibold text-lg transition-all duration-200 ${
                          invitesSent
                            ? "bg-green-600 text-white cursor-default"
                            : isSendingInvites
                              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                              : "bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-lg hover:shadow-xl"
                        }`}
                      >
                        {isSendingInvites ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Sending Invites...</span>
                          </div>
                        ) : invitesSent ? (
                          <div className="flex items-center justify-center space-x-2">
                            <Mail className="w-5 h-5" />
                            <span>Invites Sent Successfully</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <Mail className="w-5 h-5" />
                            <span>Send Invites to {students.length} Students</span>
                          </div>
                        )}
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>
          </div>

          {/* Timer Section */}
          <AnimatePresence>
            {isPollActive && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <GlassCard className="p-6 sm:p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">Session Timer</h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-white mb-2 font-mono">
                        {formatTime(timeRemaining)}
                      </div>
                      <p className="text-gray-400">Time Remaining</p>
                      {timeRemaining <= 600 && timeRemaining > 0 && (
                        <motion.p
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="text-red-400 text-sm mt-2"
                        >
                          Session expires soon!
                        </motion.p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <p className="text-gray-400 text-sm mb-3">Extend session time:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[0.5, 1, 2, 3].map(hours => (
                          <motion.button
                            key={hours}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleExtendTime(hours)}
                            className="flex items-center justify-center space-x-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg text-sm hover:shadow-lg transition-all duration-200"
                          >
                            <Plus className="w-3 h-3" />
                            <span>{hours} Hour{hours > 1 ? 's' : ''}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Student Preview */}
          <AnimatePresence>
            {students.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <GlassCard className="p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-white">
                        Student Preview ({students.length})
                      </h3>
                      {invitesSent && (
                        <div className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                          INVITED
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {showPreview ? (
                        <EyeOff className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showPreview && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-3"
                      >
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {students.slice(0, 10).map((student, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg"
                            >
                              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">
                                  {student.name}
                                </p>
                                <p className="text-gray-400 text-xs truncate">
                                  {student.email}
                                </p>
                              </div>
                              {invitesSent && (
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              )}
                            </motion.div>
                          ))}
                        </div>

                        {students.length > 10 && (
                          <p className="text-gray-400 text-sm text-center">
                            +{students.length - 10} more students
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreatePollPage;