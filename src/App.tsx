import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Send, 
  Download, 
  Settings, 
  Columns, 
  Terminal, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ChevronRight,
  Sparkles,
  Layout,
  Table as TableIcon,
  GitBranch,
  Search,
  Menu,
  X,
  Sun,
  Moon,
  Copy,
  Check,
  Code,
  FileSearch
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateDocument } from './services/gemini';
import { DocResponse, TargetFormat, DocElement } from './types';
import { MermaidDiagram } from './components/MermaidDiagram';
import { cn } from './lib/utils';
import { exportDocument } from './lib/exporter';

export default function App() {
  const [promptInput, setPromptInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [targetFormat, setTargetFormat] = useState<TargetFormat>('pdf');
  const [loading, setLoading] = useState(false);
  const [doc, setDoc] = useState<DocResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [inputMode, setInputMode] = useState<'prompt' | 'content'>('content');
  const [activeTab, setActiveTab] = useState<'preview' | 'data'>('preview');
  const [copied, setCopied] = useState(false);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleCopyCode = () => {
    if (!doc) return;
    navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = async () => {
    const currentInput = inputMode === 'prompt' ? promptInput : contentInput;
    if (!currentInput.trim()) return;
    setLoading(true);
    setError(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false); // Close sidebar on mobile after starting
    try {
      const response = await generateDocument(currentInput, targetFormat, inputMode);
      setDoc(response);
    } catch (err: any) {
      setError(err.message || 'Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!doc) return;
    
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#2563EB', '#10B981', '#F59E0B']
    });

    try {
      await exportDocument(doc);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export the document. Please check console for details.');
    }
  };

  const formats: TargetFormat[] = ['pdf', 'docx', 'excel', 'pptx', 'html', 'txt', 'markdown'];

  return (
    <div className={cn(
      "flex flex-col h-screen bg-[var(--bg)] overflow-hidden font-sans transition-colors duration-300",
      theme === 'dark' ? 'dark' : ''
    )}>
      {/* Header */}
      <header className="h-[64px] bg-[var(--sidebar)] border-b border-[var(--border)] flex items-center justify-between px-4 md:px-8 shrink-0 z-50 transition-colors shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 hover:bg-[var(--hover)] rounded-lg transition-colors text-[var(--text-main)]"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center gap-3 group cursor-default">
            <div className="w-9 h-9 bg-[var(--accent)] rounded-lg flex items-center justify-center relative overflow-hidden shadow-lg group-hover:rotate-12 transition-transform duration-500">
               <div className="absolute inset-0 bg-white/10" />
               <FileSearch className="w-5 h-5 text-white relative z-10" />
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-medium text-[var(--text-main)] tracking-tighter leading-none">
                INTELLI<span className="text-[var(--accent)]">DOC</span>
              </span>
              <span className="text-[8px] font-medium text-[var(--text-muted)] uppercase tracking-[0.3em] mt-1 opacity-60">
                Foundational Engine
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 border-r border-[var(--border)] pr-6">
             <div className="flex flex-col items-end">
               <span className="text-[9px] font-medium text-[var(--text-muted)] uppercase tracking-widest">System Health</span>
               <div className="flex items-center gap-2 mt-1">
                 <div className="flex gap-0.5">
                   {[1, 2, 3, 4].map(i => (
                     <div key={i} className="w-1 h-3 bg-[var(--success)]/20 rounded-full overflow-hidden">
                        <motion.div 
                          animate={{ height: ['20%', '80%', '20%'] }}
                          transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                          className="w-full bg-[var(--success)]" 
                        />
                     </div>
                   ))}
                 </div>
                 <span className="text-[10px] font-medium text-[var(--success)]">Operational</span>
               </div>
             </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--sidebar)] text-[var(--text-main)] hover:bg-[var(--hover)] transition-all shadow-sm active:scale-90"
              title={theme === 'light' ? 'Override to Night Protocol' : 'Restore Day Protocol'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left: Sidebar Editor */}
        <aside className={cn(
          "absolute md:relative z-40 w-[300px] md:w-[320px] h-full bg-[var(--sidebar)] border-r border-[var(--border)] flex flex-col shrink-0 transition-transform duration-300 ease-in-out md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.2em] block">
                  Processing Mode
                </label>
                <div className="flex items-center gap-1.5 px-1">
                  <div className={cn("w-1 h-1 rounded-full transition-all duration-500", inputMode === 'content' ? "bg-[var(--accent)] shadow-[0_0_6px_rgba(37,99,235,0.4)]" : "bg-zinc-200")} />
                  <div className={cn("w-1 h-1 rounded-full transition-all duration-500", inputMode === 'prompt' ? "bg-[var(--accent)] shadow-[0_0_6px_rgba(37,99,235,0.4)]" : "bg-zinc-200")} />
                </div>
              </div>
              
              <div className="p-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-inner flex relative overflow-hidden">
                {/* Momentum Background Pill - Hardware Accelerated */}
                <motion.div 
                  className="absolute inset-y-1 bg-[var(--accent)] rounded-lg shadow-sm z-0 will-change-transform"
                  initial={false}
                  animate={{ 
                    x: inputMode === 'content' ? '0%' : '100%',
                  }}
                  style={{
                    width: 'calc(50% - 4px)',
                    left: '4px'
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 35, mass: 0.8 }}
                />

                <button
                  onClick={() => setInputMode('content')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[11px] font-medium uppercase tracking-wider transition-colors relative z-10",
                    inputMode === 'content' ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Content
                </button>
                <button
                  onClick={() => setInputMode('prompt')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[11px] font-medium uppercase tracking-wider transition-colors relative z-10",
                    inputMode === 'prompt' ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Prompt
                </button>
              </div>
            </div>

            <div className="space-y-4 flex-1 flex flex-col min-h-[400px] md:min-h-0">
              <div className="relative h-4 overflow-hidden shrink-0">
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.div
                    key={inputMode}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.2em]"
                  >
                    {inputMode === 'prompt' ? 'Research Parameters' : 'Source Protocol Data'}
                  </motion.div>
                </AnimatePresence>
              </div>
              
              <div className="flex-1 grid grid-cols-1 grid-rows-1 mt-1 relative overflow-hidden rounded-xl border border-[var(--border)] shadow-inner bg-[var(--bg)]">
                {/* Content Editor Stack */}
                <motion.div
                  initial={false}
                  animate={{ 
                    opacity: inputMode === 'content' ? 1 : 0,
                    pointerEvents: inputMode === 'content' ? 'auto' : 'none',
                    zIndex: inputMode === 'content' ? 10 : 0
                  }}
                  transition={{ duration: 0.2, ease: "linear" }}
                  className="col-start-1 row-start-1 flex flex-col h-full w-full group relative will-change-opacity"
                >
                  <div className="absolute top-3 left-3 p-1.5 bg-[var(--sidebar)] rounded border border-[var(--border)] z-10 opacity-0 group-focus-within:opacity-100 transition-opacity">
                    <Terminal className="w-3 h-3 text-[var(--accent)]" />
                  </div>
                  <textarea
                    spellCheck="false"
                    className="w-full h-full p-5 pt-12 md:pt-5 text-sm leading-relaxed text-[var(--text-main)] bg-transparent focus:outline-none resize-none font-medium placeholder:text-[var(--text-muted)]/40 custom-scrollbar overflow-y-auto"
                    placeholder="Inject raw forensic data points for structural re-engineering..."
                    value={contentInput}
                    onChange={(e) => setContentInput(e.target.value)}
                  />
                </motion.div>

                {/* Prompt Editor Stack */}
                <motion.div
                  initial={false}
                  animate={{ 
                    opacity: inputMode === 'prompt' ? 1 : 0,
                    pointerEvents: inputMode === 'prompt' ? 'auto' : 'none',
                    zIndex: inputMode === 'prompt' ? 10 : 0
                  }}
                  transition={{ duration: 0.2, ease: "linear" }}
                  className="col-start-1 row-start-1 flex flex-col h-full w-full group relative will-change-opacity"
                >
                  <div className="absolute top-3 left-3 p-1.5 bg-[var(--sidebar)] rounded border border-[var(--border)] z-10 opacity-0 group-focus-within:opacity-100 transition-opacity">
                    <Terminal className="w-3 h-3 text-[var(--accent)]" />
                  </div>
                  <textarea
                    spellCheck="false"
                    className="w-full h-full p-5 pt-12 md:pt-5 text-sm leading-relaxed text-[var(--text-main)] bg-transparent focus:outline-none resize-none font-medium placeholder:text-[var(--text-muted)]/40 custom-scrollbar overflow-y-auto"
                    placeholder="Identify investigator persona & technical trace objectives..."
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                  />
                </motion.div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.2em] block">
                Target Export Format
              </label>
              <div className="relative">
                <select
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value as TargetFormat)}
                  className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all cursor-pointer appearance-none shadow-sm"
                >
                  {formats.map((f) => (
                    <option key={f} value={f}>
                      {f.toUpperCase()} Document Schema
                    </option>
                  ))}
                </select>
                <ChevronRight className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !(inputMode === 'prompt' ? promptInput : contentInput).trim()}
              className="w-full bg-[var(--accent)] text-white py-4 rounded-xl font-medium text-xs tracking-[0.2em] uppercase hover:brightness-110 disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-2 mt-auto shadow-xl active:scale-[0.98] border-b-2 border-black/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'PROCESSING...' : 'OPERATIONALIZE'}
            </button>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 flex items-start gap-2 text-xs animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="font-medium">{error}</p>
              </div>
            )}
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
          <div 
            className="absolute inset-0 bg-black/20 z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Right: Preview Area */}
        <section className="flex-1 overflow-hidden flex flex-col bg-[var(--bg)] transition-colors technical-grid relative">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 md:gap-8 relative z-10 custom-scrollbar">
            <header className="flex items-center justify-between gap-4 shrink-0 px-4 py-3 bg-[var(--sidebar)] border border-[var(--border)] rounded-xl shadow-lg transition-colors ring-1 ring-black/5">
              <div className="flex items-center gap-2 md:gap-6 min-w-0">
                {/* Internal Tab Controller */}
                <div className="flex p-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg mr-2 sm:mr-4">
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-[10px] font-medium uppercase tracking-tighter flex items-center gap-2 transition-all",
                      activeTab === 'preview' 
                        ? "bg-[var(--accent)] text-white shadow-sm" 
                        : "text-[var(--text-muted)] hover:bg-[var(--hover)]"
                    )}
                  >
                    <FileSearch className="w-3 h-3" />
                    <span className="hidden xs:inline">Preview</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('data')}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-[10px] font-medium uppercase tracking-tighter flex items-center gap-2 transition-all",
                      activeTab === 'data' 
                        ? "bg-[var(--accent)] text-white shadow-sm" 
                        : "text-[var(--text-muted)] hover:bg-[var(--hover)]"
                    )}
                  >
                    <Code className="w-3 h-3" />
                    <span className="hidden xs:inline">Engine Data</span>
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-4 text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest border-l border-[var(--border)] pl-6">
                  {doc ? (
                    <div className="flex items-center gap-2 text-[var(--success)] animate-in fade-in slide-in-from-left-2">
                      <div className="w-1.5 h-1.5 bg-[var(--success)] rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      Dataset Ready
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full" />
                      Standby
                    </div>
                  )}
                </div>
              </div>
              
              <button 
                onClick={handleExport}
                disabled={!doc}
                className="flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-lg bg-[var(--accent)] text-white shadow-lg text-[10px] md:text-xs font-medium tracking-widest hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale shrink-0 border-b-2 border-black/20"
              >
                <Download className="w-3.5 h-3.5 md:w-4 md:h-4" /> 
                <span className="hidden xs:inline">EXPORT</span> {targetFormat.toUpperCase()}
              </button>
            </header>

            <AnimatePresence mode="wait">
              {!doc && !loading && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] gap-6 py-20"
                >
                  <div className="relative group">
                    <div className="absolute inset-0 bg-[var(--accent)] blur-3xl opacity-5 group-hover:opacity-10 transition-opacity" />
                    <div className="w-24 h-24 rounded-[2rem] bg-[var(--sidebar)] border border-[var(--border)] flex items-center justify-center shadow-2xl relative rotate-3 group-hover:rotate-0 transition-transform duration-500">
                      <FileText className="w-10 h-10 text-[var(--accent)]/40" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xs font-medium text-[var(--text-main)] uppercase tracking-[0.4em]">Operational Standby</p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium max-w-[240px] leading-relaxed">
                      Initialize the DocGen engine by providing source data or a research parameter in the sidebar.
                    </p>
                  </div>
                </motion.div>
              )}

              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center gap-8 py-20"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-[var(--accent)] blur-3xl opacity-20 animate-pulse" />
                    <div className="w-20 h-20 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] border-r-[var(--accent)] animate-spin relative" />
                    <Sparkles className="w-6 h-6 text-[var(--accent)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <div className="text-center space-y-3">
                    <p className="text-sm font-medium text-[var(--text-main)] uppercase tracking-[0.5em] animate-pulse">Analyzing Assets</p>
                    <div className="flex items-center justify-center gap-1.5">
                      {[0, 1, 2].map(i => (
                        <motion.div 
                          key={i} 
                          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                          transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                          className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full" 
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {doc && !loading && (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col gap-8 pb-12 items-center"
                >
                  {activeTab === 'preview' ? (
                    <DocumentPage response={doc} />
                  ) : (
                    <div className="w-full max-w-5xl bg-[#0F172A] border border-white/5 rounded-2xl shadow-3xl overflow-hidden relative group">
                      <div className="bg-white/5 px-6 py-3 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Terminal className="w-4 h-4 text-blue-400" />
                          <span className="text-[10px] font-medium text-white/50 uppercase tracking-widest leading-none pt-1">Forensic JSON Manifest</span>
                        </div>
                        <button
                          onClick={handleCopyCode}
                          className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-all flex items-center gap-2 text-[10px] uppercase font-medium"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? 'Copied' : 'Copy Protocol'}
                        </button>
                      </div>
                      <div className="p-6 md:p-8 font-mono text-[11px] md:text-xs leading-relaxed max-h-[800px] overflow-y-auto custom-scrollbar">
                        <pre className="text-blue-100/70 whitespace-pre-wrap">
                          {JSON.stringify(doc, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
}

const DocumentPage = memo(({ response }: { response: DocResponse }) => {
  const isSlideFormat = ['pptx', 'ppt', 'slides'].includes(response.target_format);
  const isExcelFormat = response.target_format === 'excel';
  const isRawFormat = response.target_format === 'txt';

  if (isRawFormat) {
    return <RawPreview response={response} />;
  }

  if (isExcelFormat) {
    return <SpreadsheetPreview response={response} />;
  }

  if (isSlideFormat) {
    return <SlidePreview response={response} />;
  }

  return (
    <div id="document-page" className="bg-[var(--sidebar)] border border-[var(--border)] rounded-xl md:rounded-2xl p-4 md:p-10 shadow-2xl w-full max-w-5xl mx-auto ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-500 transition-colors">
      {/* Meta Row */}
      <div className="flex flex-wrap gap-6 md:gap-12 mb-10 border-b border-[var(--border)] pb-8">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest">Engine Mode</span>
          <span className="text-xs font-medium text-[var(--text-main)] bg-[var(--bg)] px-2 py-1 rounded-md transition-colors">{response.detected_mode}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest">Renderer</span>
          <span className="text-[11px] font-medium bg-[var(--accent)] text-white px-2.5 py-1 rounded-md uppercase shadow-sm">
            {response.target_format}_V1
          </span>
        </div>
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest">Document Registry</span>
          <span className="text-xs font-medium text-[var(--text-main)] truncate">{response.metadata.title}</span>
        </div>
      </div>

      <header className="mb-12">
        <h2 className="text-2xl md:text-3xl font-medium text-[var(--text-main)] mb-6 tracking-tight leading-tight">{response.metadata.title}</h2>
        <div className="p-5 bg-[var(--accent)]/5 border-l-4 border-[var(--accent)] rounded-r-xl transition-colors">
          <p className="text-sm text-[var(--text-muted)] leading-relaxed font-medium italic">
            {response.metadata.summary}
          </p>
        </div>
      </header>

      <div className="space-y-10">
        {response.content.elements.map((element, idx) => (
          <DocElementView key={idx} element={element} />
        ))}
      </div>
    </div>
  );
});

const SlidePreview = memo(({ response }: { response: DocResponse }) => {
  // Group elements into slides based on headings
  const slides: any[] = [];
  let currentSlide: any = null;

  response.content.elements.forEach((el) => {
    if (el.type === 'heading') {
      if (currentSlide) slides.push(currentSlide);
      currentSlide = { title: el.text, elements: [] };
    } else {
      if (!currentSlide) currentSlide = { title: response.metadata.title, elements: [] };
      currentSlide.elements.push(el);
    }
  });
  if (currentSlide) slides.push(currentSlide);

  return (
    <div className="flex flex-col gap-8 md:gap-12 w-full max-w-5xl mx-auto px-2 md:px-4 pb-20">
      <div className="text-center space-y-2">
        <span className="text-[10px] font-medium text-[var(--accent)] uppercase tracking-[0.3em]">Presentation Preview</span>
        <h2 className="text-2xl md:text-3xl font-medium text-[var(--text-main)] truncate px-4">{response.metadata.title}</h2>
      </div>
      <div className="grid grid-cols-1 gap-8 md:gap-12">
        {slides.map((slide, i) => (
          <div key={i} className="aspect-auto md:aspect-video min-h-[320px] md:min-h-[450px] w-full bg-[var(--sidebar)] border-2 md:border-4 border-[var(--border)] rounded-2xl md:rounded-3xl shadow-xl md:shadow-2xl flex flex-col overflow-hidden relative group transition-all">
            <div className="absolute top-0 left-0 w-1 md:w-1.5 h-full bg-[var(--accent)] transition-all group-hover:w-3" />
            
            {/* Slide Header */}
            <div className="px-5 pt-5 md:px-12 md:pt-12 shrink-0">
               <h3 className="text-lg md:text-4xl font-medium text-[var(--text-main)] tracking-tight border-b-2 border-[var(--accent)]/20 pb-3 md:pb-4 inline-block max-w-full truncate">
                 {slide.title}
               </h3>
            </div>
 
            {/* Slide Content */}
            <div className="px-5 pb-5 md:px-12 md:pb-12 flex-1 overflow-y-auto custom-scrollbar mt-3 md:mt-6">
              <div className="space-y-3 md:space-y-6 max-w-4xl">
                {slide.elements.map((el: any, idx: number) => (
                  <DocElementView key={idx} element={el} isSlideView />
                ))}
              </div>
            </div>

            <div className="h-10 md:h-12 bg-[var(--bg)] border-t border-[var(--border)] flex items-center justify-between px-4 md:px-8 text-[8px] md:text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest shrink-0 gap-4">
              <span className="shrink-0 whitespace-nowrap">DocGen Engine • Slide {i + 1} of {slides.length}</span>
              <span className="truncate min-w-0 text-right">{response.metadata.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

const SpreadsheetPreview = memo(({ response }: { response: DocResponse }) => {
  return (
    <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg shadow-xl w-full mx-auto overflow-hidden animate-in fade-in transition-colors">
      <div className="bg-[var(--sidebar)] border-b border-[var(--border)] px-4 py-2 flex items-center gap-4">
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/50" />
        </div>
        <div className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
          <TableIcon className="w-3 h-3" /> {response.metadata.title}.xls
        </div>
      </div>
      
      <div className="overflow-auto max-h-[800px] custom-scrollbar">
        <div className="p-4 md:p-8 space-y-12 bg-[var(--sidebar)]">
          {response.content.elements.map((el, i) => (
            <div key={i} className="space-y-4">
              {el.type === 'heading' && (
                <div className="bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-medium p-2 border-l-2 border-[var(--accent)] uppercase tracking-widest">
                  Sheet: {el.text}
                </div>
              )}
              <DocElementView element={el} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

const RawPreview = memo(({ response }: { response: DocResponse }) => {
  return (
    <div className="bg-[#0F172A] p-6 md:p-10 rounded-2xl shadow-3xl w-full max-w-4xl mx-auto border border-white/5 font-mono text-sm leading-relaxed text-blue-100/90 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
      <div className="mb-8 border-b border-white/10 pb-4 flex justify-between items-center">
        <span className="text-[10px] font-medium text-blue-400/50 uppercase tracking-[0.2em]">Raw Output Protocol</span>
        <span className="text-[10px] text-white/20">{new Date().toISOString()}</span>
      </div>
      
      <div className="space-y-6 max-h-[700px] overflow-y-auto custom-scrollbar pr-4">
        <div className="text-xl font-medium text-white mb-8 border-l-4 border-blue-500 pl-4">
          {response.metadata.title.toUpperCase()}
        </div>
        {response.content.elements.map((el, i) => (
          <div key={i} className="space-y-2">
            {el.type === 'heading' && <div className="text-blue-400 font-medium mt-8 mb-2">[{el.text.toUpperCase()}]</div>}
            {el.type === 'paragraph' && <div>{el.text}</div>}
            {el.type === 'list' && (
              <div className="pl-4 space-y-1">
                {el.items?.map((item, j) => <div key={j}>• {item}</div>)}
              </div>
            )}
            {el.type === 'table' && (
              <div className="border border-white/10 p-4 rounded bg-white/5 overflow-x-auto text-[10px]">
                <div className="flex gap-4 font-medium border-b border-white/10 pb-2 mb-2">
                  {el.headers?.map((h, j) => <div key={j} className="min-w-[100px]">{h}</div>)}
                </div>
                {el.rows?.map((row, j) => (
                  <div key={j} className="flex gap-4 opacity-70">
                    {row.map((cell, k) => <div key={k} className="min-w-[100px]">{cell}</div>)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

const DocElementView = memo(({ element, isSlideView }: { element: DocElement, isSlideView?: boolean }) => {
  const styles = element.style || {};
  
  const containerStyles = {
    backgroundColor: styles.highlight_bg,
    color: styles.text_color,
    fontWeight: styles.bold ? 'bold' : 'normal',
    fontStyle: styles.italic ? 'italic' : 'normal',
  };

  switch (element.type) {
    case 'heading':
      return (
        <h3 
          style={containerStyles}
          className={cn(
            "text-lg md:text-xl font-medium text-[var(--text-main)] mb-3 md:mb-4 border-b-2 border-[var(--border)] pb-2 flex items-center gap-3 transition-colors",
            "break-after-avoid page-break-after-avoid",
            isSlideView && "text-base md:text-2xl mt-2",
            styles.highlight_bg && "p-3 rounded-lg"
          )}
        >
          <span className="w-1 md:w-1.5 h-5 md:h-6 bg-[var(--accent)] rounded-full shrink-0" />
          {element.text}
        </h3>
      );
    
    case 'paragraph':
      return (
        <p 
          style={containerStyles}
          className={cn(
            "text-xs md:text-base leading-relaxed text-[var(--text-muted)] mb-4 md:mb-6 font-medium transition-colors whitespace-pre-line",
            isSlideView && "text-[11px] md:text-lg mb-2"
          )}
        >
          {element.text}
        </p>
      );

    case 'list':
      return (
        <ul className={cn(
          "space-y-2 md:space-y-3 my-4 md:my-6 pl-2",
          isSlideView && "my-2 md:my-4"
        )}>
          {element.items?.map((item, i) => (
            <li key={i} className={cn(
              "flex gap-3 md:gap-4 text-xs md:text-base text-[var(--text-muted)] group transition-colors",
              isSlideView && "text-[11px] md:text-lg gap-2"
            )}>
              <span className="text-[var(--accent)] font-medium mt-0.5 group-hover:translate-x-1 transition-transform">→</span>
              <span className="font-medium">{item}</span>
            </li>
          ))}
        </ul>
      );

    case 'table':
      return (
        <div className={cn(
          "my-4 md:my-8 overflow-x-auto rounded-lg md:rounded-xl border border-[var(--border)] shadow-sm scrollbar-hide transition-colors",
          "break-inside-avoid page-break-inside-avoid",
          isSlideView && "my-2 md:my-4"
        )}>
          <table className="w-full text-[10px] md:text-sm border-collapse min-w-[320px] md:min-w-[600px]">
            <thead>
              <tr className="bg-[var(--text-main)] border-b border-[var(--border)]">
                {element.headers?.map((h, i) => (
                  <th key={i} className="px-3 md:px-5 py-2 md:py-4 text-left font-medium text-[var(--bg)] uppercase tracking-widest text-[8px] md:text-[10px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {element.rows?.map((row, i) => (
                <tr 
                  key={i} 
                  className={cn(
                    "border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent)]/5 transition-colors",
                    i % 2 !== 0 && "bg-[var(--bg)]/50"
                  )}
                >
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 md:px-5 py-2 md:py-4 text-[var(--text-main)] font-medium truncate max-w-[120px] md:max-w-none">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'diagram':
      return (
        <div className={cn(
          "my-6 md:my-10 break-inside-avoid page-break-inside-avoid",
          isSlideView && "my-2 md:my-6"
        )}>
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-6">
            <GitBranch className="w-3 md:w-4 h-3 md:h-4 text-[var(--accent)]" />
            <span className="text-[8px] md:text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest">
              Architectural Schema: {element.diagram_type}
            </span>
          </div>
          {element.mermaid_code ? (
            <div className={cn(
              "p-3 md:p-4 bg-[var(--sidebar)] border-2 border-[var(--border)] rounded-xl md:rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] min-h-[140px] md:min-h-[200px] flex items-center justify-center transition-colors",
              isSlideView && "min-h-[100px] md:min-h-[180px]"
            )}>
               <div className="w-full scale-90 md:scale-100 flex justify-center overflow-x-auto scollbar-hide">
                 <MermaidDiagram code={element.mermaid_code} />
               </div>
            </div>
          ) : (
            <div className="h-[80px] md:h-[120px] bg-[var(--bg)] border border-dashed border-[var(--border)] rounded-xl flex items-center justify-center text-[var(--text-muted)] text-[8px] md:text-xs font-medium uppercase tracking-widest transition-colors">
               Matrix Data Missing
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
});
