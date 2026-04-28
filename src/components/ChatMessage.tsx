import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/src/lib/utils';
import { Copy, Terminal } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'model';
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isModel = role === 'model';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className={cn(
      "flex w-full flex-col mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500",
      isModel ? "items-start" : "items-end"
    )}>
      <div className={cn(
        "max-w-[85%] px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-lg",
        isModel 
          ? "bg-nexus-surface border border-nexus-border text-gray-200 rounded-tl-none" 
          : "bg-nexus-accent/10 border border-nexus-accent/30 text-nexus-accent rounded-tr-none"
      )}>
        <ReactMarkdown
          components={{
            code({ node, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const isInline = !match;
              return !isInline ? (
                <div className="relative group my-4">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => copyToClipboard(String(children))}
                      className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-black/40 rounded-t-md border-x border-t border-white/5">
                    <Terminal className="w-3 h-3 text-nexus-accent" />
                    <span className="text-[10px] uppercase tracking-widest text-nexus-accent font-mono">
                      {match[1] || 'code'}
                    </span>
                  </div>
                  <pre className="bg-black/60 p-4 rounded-b-md border-x border-b border-white/5 overflow-x-auto font-mono text-sm leading-relaxed">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                </div>
              ) : (
                <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-sm" {...props}>
                  {children}
                </code>
              );
            },
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
      <span className="text-[10px] mt-1.5 opacity-30 font-mono tracking-widest uppercase px-2">
        {role === 'user' ? 'YOU' : 'NEXUS PRIME'}
      </span>
    </div>
  );
}
