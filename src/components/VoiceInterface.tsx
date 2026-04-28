import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface VoiceInterfaceProps {
  onTranscript: (text: string) => void;
  isProcessing: boolean;
  autoSpeak?: boolean;
}

export default function VoiceInterface({ onTranscript, isProcessing, autoSpeak = true }: VoiceInterfaceProps) {
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, [onTranscript]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleListening}
        disabled={isProcessing}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 relative",
          isListening ? "bg-nexus-accent neon-border" : "bg-nexus-surface border border-nexus-border",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
      >
        <AnimatePresence mode="wait">
          {isListening ? (
            <motion.div
              key="mic-on"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              <Mic className="text-nexus-bg w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="mic-off"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              <MicOff className="text-nexus-accent w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>

        {isListening && (
          <motion.div
            layoutId="voice-ring"
            className="absolute inset-0 rounded-full border-2 border-nexus-accent"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </motion.button>

      <button
        onClick={() => setIsMuted(!isMuted)}
        className="w-10 h-10 rounded-full flex items-center justify-center bg-nexus-surface border border-nexus-border"
      >
        {isMuted ? <VolumeX className="w-5 h-5 opacity-50" /> : <Volume2 className="w-5 h-5 text-nexus-accent" />}
      </button>
    </div>
  );
}

export function speak(text: string) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 0.9; // Slightly lower for that premium mastermind feel
    window.speechSynthesis.speak(utterance);
  }
}
