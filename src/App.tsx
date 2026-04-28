import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  signInWithPopup, 
  googleProvider, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  FirebaseUser,
  handleFirestoreError,
  OperationType,
  testConnection 
} from '@/src/lib/firebase';
import { generateAiResponse, extractMemories } from '@/src/services/aiService';
import VoiceInterface, { speak } from '@/src/components/VoiceInterface';
import ChatMessage from '@/src/components/ChatMessage';
import { cn } from '@/src/lib/utils';
import { 
  Send, 
  Brain, 
  Terminal, 
  Settings, 
  LogOut, 
  Sparkles, 
  Cpu, 
  Layers,
  ChevronRight,
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

interface UserMemory {
  id: string;
  fact: string;
}

interface CoreNode {
  id: string;
  label: string;
  status: 'active' | 'syncing';
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [uiLevel, setUiLevel] = useState(1);
  const [activeNodes, setActiveNodes] = useState<CoreNode[]>([
    { id: '1', label: 'Neural Alpha', status: 'active' },
    { id: '2', label: 'Logic Beta', status: 'active' },
  ]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        initUser(u);
      }
    });
    return () => unsubscribe();
  }, []);

  const initUser = async (u: FirebaseUser) => {
    const userDocRef = doc(db, 'users', u.uid);
    try {
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          userId: u.uid,
          displayName: u.displayName,
          preferences: { theme: 'nexus-dark', voiceEnabled: true, devMode: false },
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${u.uid}`);
    }

    // Subscribe to memories
    const memoriesPath = `users/${u.uid}/memories`;
    const memoriesQuery = query(collection(db, memoriesPath), orderBy('createdAt', 'desc'));
    onSnapshot(memoriesQuery, (snapshot) => {
      setMemories(snapshot.docs.map(doc => ({ id: doc.id, fact: doc.data().fact })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, memoriesPath);
    });

    // Simulate "Real-time" collaboration syncing
    const interval = setInterval(() => {
      setActiveNodes(prev => prev.map(node => ({
        ...node,
        status: Math.random() > 0.8 ? 'syncing' : 'active'
      })));
    }, 5000);
    return () => clearInterval(interval);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim() || !user) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      const response = await generateAiResponse(
        text, 
        messages.map(m => ({ role: m.role, content: m.content })),
        { 
          userName: user.displayName || 'tovinnn', 
          memories: memories.map(m => m.fact).join(', '),
          uiLevel: uiLevel
        }
      );

      const aiMessage: Message = { id: (Date.now() + 1).toString(), role: 'model', content: response };
      setMessages(prev => [...prev, aiMessage]);
      
      // Auto-speak if enabled
      speak(response);

      // Extract memories in the background
      extractMemories(text, memories.map(m => m.fact).join(', ')).then(async (newFacts) => {
        if (newFacts && newFacts.toLowerCase() !== 'none') {
          const memoriesPath = `users/${user.uid}/memories`;
          try {
            await addDoc(collection(db, memoriesPath), {
              userId: user.uid,
              fact: newFacts,
              importance: 1,
              createdAt: serverTimestamp(),
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, memoriesPath);
          }
        }
      });

    } catch (error) {
      console.error('Error generating AI response:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const login = async () => {
    setIsProcessing(true);
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        setLoginError("Neural link synchronization was interrupted. Please do not close the window.");
      } else {
        setLoginError("An unexpected error occurred during neural link initialization.");
      }
      console.error('Login error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full nexus-card p-10 relative overflow-hidden text-center z-10"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-nexus-accent neon-border" />
          <div className="relative w-24 h-24 mx-auto mb-6 group">
             <div className="absolute inset-0 bg-nexus-accent rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
             <img 
               src="https://images.squarespace-cdn.com/content/v1/5e7ce00569766c61556a31c0/1628108480373-Z6XUXW9B6XQZ6Z8Z8Z8Z/Rugrats+Couture+Chuckie+Boss.jpg?format=1500w" 
               className="w-24 h-24 rounded-2xl border-2 border-nexus-accent object-cover relative z-10 shadow-2xl" 
               alt="Nexus Prime Icon"
               onError={(e) => {
                 (e.target as HTMLImageElement).src = '/nexus_bg.png'; // Try local
               }}
             />
          </div>
          <h1 className="text-4xl font-bold mb-4 tracking-tighter">NEXUS PRIME</h1>
          <p className="text-gray-400 mb-8 font-light italic">"Precision. Power. Premium."</p>
          
          <AnimatePresence>
            {loginError && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-xs mb-6 font-mono"
              >
                {loginError}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={login}
            disabled={isProcessing}
            className={cn(
              "w-full py-4 bg-nexus-accent text-nexus-bg font-bold rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)]",
              isProcessing ? "opacity-50 cursor-wait bg-white" : "hover:bg-white"
            )}
          >
            {isProcessing ? (
              <Cpu className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            {isProcessing ? 'SYNCHRONIZING...' : 'INITIALIZE NEURAL LINK'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-nexus-bg">
      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full bg-nexus-surface border-r border-nexus-border flex flex-col z-20"
          >
            <div className="p-6 border-b border-nexus-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-nexus-accent/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]">
                  <img src="https://images.squarespace-cdn.com/content/v1/5e7ce00569766c61556a31c0/1628108480373-Z6XUXW9B6XQZ6Z8Z8Z8Z/Rugrats+Couture+Chuckie+Boss.jpg?format=1500w" className="w-full h-full object-cover" alt="Prime" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold tracking-widest text-xs">NEXUS PRIME</span>
                  <span className="text-[8px] text-nexus-accent font-mono">NEURAL CORE ACTIVE</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Neural Memories</h3>
                  <Brain className="w-3 h-3 text-nexus-accent" />
                </div>
                <div className="space-y-3">
                  {memories.length === 0 ? (
                    <div className="text-[11px] text-gray-600 font-light italic">No cognitive patterns extracted yet.</div>
                  ) : (
                    memories.slice(0, 5).map((m) => (
                      <div key={m.id} className="p-3 bg-black/30 rounded-lg border border-white/5 text-[12px] text-gray-400 leading-snug">
                        {m.fact}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Live Collaboration</h3>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                    <Layers className="w-3 h-3 text-gray-500" />
                  </div>
                </div>
                <div className="space-y-2">
                   {activeNodes.map(node => (
                     <div key={node.id} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-1.5 h-1.5 rounded-full", node.status === 'active' ? 'bg-nexus-accent' : 'bg-yellow-500 animate-pulse')} />
                          <span className="text-[11px] text-gray-400">{node.label}</span>
                        </div>
                        <span className="text-[9px] text-gray-600 uppercase font-mono">{node.status}</span>
                     </div>
                   ))}
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-bold tracking-widest uppercase text-gray-500">Capabilities</h3>
                  <Cpu className="w-3 h-3 text-gray-500" />
                </div>
                <ul className="space-y-2">
                  {['Neural Synthesis', 'Omni-Language Code', 'Contextual Recall', 'Adaptive Interface'].map((cap) => (
                    <li key={cap} className="flex items-center gap-2 text-[12px] text-gray-400">
                      <ChevronRight className="w-3 h-3 text-nexus-accent opacity-50" />
                      {cap}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-6 border-t border-nexus-border bg-black/20">
               <div className="flex items-center gap-4 mb-4">
                  <img src={user.photoURL || ''} className="w-10 h-10 rounded-full border border-nexus-border" alt="Avatar" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{user.displayName}</div>
                    <div className="text-[10px] text-nexus-accent uppercase tracking-wider font-bold">Premium Tier</div>
                  </div>
               </div>
               <button 
                onClick={() => auth.signOut()}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors text-xs text-gray-400"
               >
                 Sign Out
                 <LogOut className="w-4 h-4" />
               </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col relative h-full">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 bg-nexus-bg/80 backdrop-blur-md border-b border-nexus-border z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Cpu className="w-5 h-5 text-nexus-accent" />
            </button>
            <div className="h-4 w-[1px] bg-white/10" />
            <h2 className="text-sm font-medium flex items-center gap-2 uppercase tracking-widest opacity-80">
              <Sparkles className="w-4 h-4 text-nexus-accent" />
              Dynamic Neural Link
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowDevPanel(!showDevPanel)}
              className={cn(
                "p-2 rounded-lg transition-all",
                showDevPanel ? "bg-nexus-accent/20 text-nexus-accent" : "hover:bg-white/5 text-gray-400"
              )}
            >
              <Terminal className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 scroll-smooth">
          <div className="max-w-4xl mx-auto py-10">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center py-20 space-y-6">
                <div className="w-20 h-20 rounded-2xl bg-nexus-accent/10 border border-nexus-accent/20 flex items-center justify-center animate-pulse">
                  <Brain className="w-10 h-10 text-nexus-accent" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">Systems Online, tovinnn.</h1>
                  <p className="text-gray-500 font-light max-w-sm mx-auto uppercase tracking-widest text-[10px]">What complex operation shall we execute today?</p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mt-12">
                   {[
                     { icon: Terminal, label: 'Optimization Logic', sub: 'Generate Rust kernel code' },
                     { icon: Brain, label: 'Cognitive Analysis', sub: 'Explain quantum decoherence' },
                     { icon: Sparkles, label: 'Creative Synthesis', sub: 'Write a poem about neon' },
                     { icon: Layers, label: 'Structural Review', sub: 'Audit my architectural plans' }
                   ].map((item) => (
                     <button 
                      key={item.label}
                      onClick={() => handleSend(item.sub)}
                      className="text-left p-4 rounded-xl border border-nexus-border bg-nexus-surface hover:bg-white/5 hover:border-white/20 transition-all group"
                     >
                        <item.icon className="w-5 h-5 mb-3 text-nexus-accent transition-transform group-hover:scale-110" />
                        <div className="font-medium text-sm mb-1">{item.label}</div>
                        <div className="text-[11px] text-gray-500 font-light">{item.sub}</div>
                     </button>
                   ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <ChatMessage key={m.id} role={m.role} content={m.content} />
            ))}

            {isProcessing && (
              <div className="flex items-center gap-3 text-nexus-accent px-2">
                <div className="flex gap-1">
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1 h-1 bg-current rounded-full" />
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-current rounded-full" />
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-current rounded-full" />
                </div>
                <span className="text-[10px] font-bold tracking-tighter uppercase animate-pulse">Nexus Prime is Thinking...</span>
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="p-8 pb-10 bg-gradient-to-t from-nexus-bg via-nexus-bg to-transparent">
          <div className="max-w-4xl mx-auto relative">
            <div className="nexus-card bg-black/60 backdrop-blur-2xl p-2 pl-4 flex items-center gap-4 relative z-10">
              <VoiceInterface onTranscript={handleSend} isProcessing={isProcessing} />
              <div className="h-8 w-[1px] bg-white/10" />
              <button 
                onClick={() => setInputValue('Translate this to Japanese perfectly: ')}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 flex items-center gap-2"
                title="Advanced Translation"
              >
                <div className="w-1.5 h-1.5 bg-nexus-accent rounded-full" />
                <span className="text-[10px] font-bold uppercase tracking-widest hidden md:inline">Translate</span>
              </button>
              <div className="h-8 w-[1px] bg-white/10" />
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(inputValue);
                  }
                }}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3 resize-none max-h-32 text-gray-200 placeholder:text-gray-600 outline-none"
                placeholder="Directive input..."
                rows={1}
              />
              <button 
                onClick={() => handleSend(inputValue)}
                disabled={!inputValue.trim() || isProcessing}
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                  inputValue.trim() ? "bg-nexus-accent text-nexus-bg shadow-lg neon-border" : "bg-white/5 text-white/20"
                )}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            <AnimatePresence>
              {showDevPanel && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  className="absolute bottom-full left-0 right-0 mb-4 nexus-card bg-nexus-surface/95 backdrop-blur-3xl p-6 z-20 border-nexus-accent/30"
                >
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <Terminal className="text-nexus-accent w-5 h-5" />
                        <h3 className="font-bold text-sm tracking-widest uppercase">Developer Mode Lab</h3>
                      </div>
                      <div className="px-2 py-0.5 rounded bg-nexus-accent/20 text-nexus-accent text-[9px] font-bold uppercase tracking-widest animate-pulse">Experimental</div>
                   </div>
                   
                   <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                          <Cpu className="w-3 h-3" /> System Entropy
                        </label>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${65 + uiLevel * 5}%` }} 
                            className="h-full bg-nexus-accent" 
                          />
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">{65 + uiLevel * 5}% OPTIMIZED</div>
                        <button 
                          onClick={() => setUiLevel(prev => Math.min(prev + 1, 5))}
                          className="text-[10px] text-nexus-accent border border-nexus-accent/30 px-2 py-1 rounded hover:bg-nexus-accent/10 transition-colors"
                        >
                          Manual Adaption Trigger
                        </button>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                          <Brain className="w-3 h-3" /> Neural Synapse Frequency
                        </label>
                        <div className="flex gap-1 h-8 items-end">
                          {[40, 70, 45, 90, 30, 60, 85, 40].map((h, i) => (
                            <motion.div 
                              key={i} 
                              animate={{ height: [`${h}%`, `${Math.random() * 100}%`, `${h}%`] }} 
                              transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.1 }}
                              className="w-full bg-nexus-accent/30 rounded-t-sm" 
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                          <UserIcon className="w-3 h-3" /> Bio-Metric Correlation
                        </label>
                        <div className="text-[14px] font-mono text-nexus-accent font-bold">STABLE [0.992]</div>
                        <div className="text-[10px] text-gray-600 uppercase tracking-tighter">Connection Heartbeat: 12ms</div>
                      </div>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
