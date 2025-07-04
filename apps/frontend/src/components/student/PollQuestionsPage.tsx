import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Trophy, Zap, Target, Timer } from "lucide-react";
import GlassCard from "../GlassCard";

interface Question {
  id?: string;
  _id?: string;
  question: string;
  options: string[];
  timeLimit: number;
  points: number;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  correct_answer: string;
  is_active?: boolean;
  is_approved?: boolean;
}

interface PollQuestionsPageProps {
  roomCode: string;
}

const PollQuestionsPage: React.FC<PollQuestionsPageProps> = ({ roomCode }) => {
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [streak, setStreak] = useState(0);
  const [totalParticipants] = useState(47);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const socketRef = useRef<Socket | null>(null);

  // Setup socket connection
  useEffect(() => {
    const socket: Socket = io("http://localhost:5001", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionStatus("Connected");
      console.log("✅ Connected to WebSocket server");
    });

    socket.on("disconnect", () => {
      setConnectionStatus("Disconnected");
      console.log("❌ Disconnected from WebSocket server");
    });

    socket.on("connect_error", (err) => {
      setConnectionStatus("Connection Failed");
      console.error("❌ Connection error:", err.message);
    });

    // Handle new questions
    socket.on("poll-question", (newQuestion: Question) => {
      setConnectionStatus("Receiving Question...");
      
      // Set defaults if missing
      const q = {
        ...newQuestion,
        timeLimit: newQuestion.timeLimit || 30,
        points: newQuestion.points || 100,
        correct_answer: newQuestion.correct_answer || ""
      };
      
      setQuestion(q);
      setTimeLeft(q.timeLimit);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setShowResult(false);
      setAnsweredCount(0);
      
      console.log("📝 New question received:", q.question);
      setTimeout(() => setConnectionStatus("Connected"), 2000);
    });

    // Handle no active questions
    socket.on("no-active-question", () => {
      setQuestion(null);
      setConnectionStatus("No Active Questions");
      console.log("⚠️ No active questions available");
    });

    // Request initial question
    socket.emit("next-question");

    return () => {
      socket.disconnect();
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (!question || isAnswered) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [question, isAnswered]);

  const handleTimeUp = () => {
    setIsAnswered(true);
    setShowResult(true);
    setStreak(0);
    setAnsweredCount(totalParticipants);
    console.log("⏰ Time's up!");
    setTimeout(resetQuestion, 3000);
  };

  const handleAnswerSelect = (index: number) => {
    if (isAnswered || !question) return;

    setSelectedAnswer(index);
    setIsAnswered(true);
    setShowResult(true);
    setAnsweredCount(Math.floor(Math.random() * 20) + totalParticipants - 20);

    const selected = question.options[index];
    const isCorrect = selected === question.correct_answer;

    console.log(`🧠 Selected answer: ${selected} | Correct: ${isCorrect}`);
    
    if (isCorrect) {
      const timeBonus = Math.floor((timeLeft / question.timeLimit) * 50);
      const totalPoints = question.points + timeBonus;
      setScore(score + totalPoints);
      setStreak(streak + 1);
      console.log(`🏆 Correct! +${totalPoints} points (${timeBonus} bonus)`);
    } else {
      setStreak(0);
      console.log("❌ Incorrect answer");
    }

    setTimeout(resetQuestion, 3000);
  };

  const resetQuestion = () => {
    setQuestion(null);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setShowResult(false);
    setTimeLeft(0);
    setAnsweredCount(0);
    console.log("🔄 Resetting for next question");
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "from-green-500 to-emerald-500";
      case "Medium": return "from-yellow-500 to-orange-500";
      case "Hard": return "from-red-500 to-pink-500";
      default: return "from-gray-500 to-gray-600";
    }
  };

  const getTimerColor = () => {
    if (!timeLeft) return "text-gray-400";
    if (timeLeft <= 5) return "text-red-400 animate-pulse";
    if (timeLeft <= 10) return "text-yellow-400";
    return "text-green-400";
  };

  const getOptionColor = (index: number) => {
    if (!showResult) {
      return selectedAnswer === index 
        ? "bg-primary-500/20 border-primary-500 text-primary-300" 
        : "bg-white/5 border-white/20 text-white hover:bg-white/10";
    }
    
    const option = question?.options[index];
    const isCorrect = option === question?.correct_answer;
    const isSelectedWrong = selectedAnswer === index && !isCorrect;

    if (isCorrect) return "bg-green-500/20 border-green-500 text-green-300";
    if (isSelectedWrong) return "bg-red-500/20 border-red-500 text-red-300";
    if (selectedAnswer === index) return "bg-primary-500/20 border-primary-500 text-primary-300";
    
    return "bg-white/5 border-white/20 text-white";
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary-500/20 to-secondary-500/20 border border-primary-500/30 rounded-full px-6 py-2 mb-4">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === "Connected" ? "bg-green-400 animate-pulse" : 
            connectionStatus === "Disconnected" ? "bg-red-400" : "bg-yellow-400"
          }`}></div>
          <span className="font-medium">
            {connectionStatus === "Connected" ? "Live Session Active" : connectionStatus}
          </span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Interactive Poll</h1>
        <p className="text-gray-400 truncate max-w-md mx-auto">{roomCode}</p>
      </motion.div>

      <GlassCard className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div><Trophy className="mx-auto text-primary-400" /><div className="text-white font-bold">{score}</div><div className="text-sm text-gray-400">Total Score</div></div>
          <div><Zap className="mx-auto text-yellow-400" /><div className="text-white font-bold">{streak}</div><div className="text-sm text-gray-400">Streak</div></div>
          <div><Users className="mx-auto text-blue-400" /><div className="text-white font-bold">{totalParticipants}</div><div className="text-sm text-gray-400">Participants</div></div>
          <div><Target className="mx-auto text-green-400" /><div className="text-white font-bold">100%</div><div className="text-sm text-gray-400">Progress</div></div>
        </div>
      </GlassCard>

      <AnimatePresence mode="wait">
        {question ? (
          <motion.div
            key={question.question}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <GlassCard className="p-6">
              <div className="mb-4 flex justify-between items-center">
                <div className={`flex items-center space-x-2 ${getTimerColor()}`}>
                  <Timer className="w-6 h-6" />
                  <span className="text-2xl font-bold">{timeLeft}</span>
                  <span>sec</span>
                </div>
                <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${getDifficultyColor(question.difficulty)} text-white text-sm font-medium`}>
                  {question.difficulty}
                </div>
              </div>

              <div className="text-white text-lg font-semibold mb-6">
                {question.question}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {question.options.map((option, index) => {
                  const optionLabel = ["A", "B", "C", "D"][index];
                  
                  return (
                    <motion.button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={isAnswered}
                      whileHover={!isAnswered ? { scale: 1.02 } : {}}
                      whileTap={!isAnswered ? { scale: 0.98 } : {}}
                      className={`p-4 rounded-xl text-left border-2 transition-all ${getOptionColor(index)}`}
                    >
                      <span className="font-mono mr-2 font-bold">{optionLabel}.</span> {option}
                    </motion.button>
                  );
                })}
              </div>

              {showResult && (
                <div className="mt-6 text-center text-sm text-gray-300">
                  {answeredCount}/{totalParticipants} students answered
                </div>
              )}
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="inline-block p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-2xl">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin mb-4"></div>
                <h3 className="text-xl font-semibold text-indigo-300 mb-2">Waiting for Question</h3>
                <p className="text-gray-400 max-w-md">
                  The next poll question will appear here automatically when the instructor starts it.
                </p>
                <div className="mt-4 text-sm text-gray-500">
                  Status: {connectionStatus}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PollQuestionsPage;