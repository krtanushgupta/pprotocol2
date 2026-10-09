import React, { useState, useRef } from 'react';
import { Upload, ArrowRight, AlertCircle, Shield, Cpu, Cloud, Sparkles, Terminal } from 'lucide-react';
import { SYNTHETIC_SAMPLES } from '../data/samples';

interface InputScreenProps {
  onAnalyze: (text: string, useCloud: boolean) => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

export const InputScreen: React.FC<InputScreenProps> = ({
  onAnalyze,
  isLoading,
  errorMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [validationNote, setValidationNote] = useState<string | null>(null);
  const [useCloud, setUseCloud] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size === 0) {
      setValidationNote('The selected file is empty (0 bytes).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setValidationNote('File is too large. Please select a chat export under 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content || !content.trim()) {
        setValidationNote('The selected file contains no readable text.');
        return;
      }
      setValidationNote(null);
      setInputText(content);
      setFileName(file.name);
    };
    reader.onerror = () => {
      setValidationNote('Unable to read this file. Please paste the conversation text directly.');
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setValidationNote('Please paste conversation text or upload a WhatsApp .txt export.');
      return;
    }
    setValidationNote(null);
    onAnalyze(inputText.trim(), useCloud);
  };

  const handleLoadSample = (sampleId: string) => {
    const sample = SYNTHETIC_SAMPLES.find((s) => s.id === sampleId);
    if (sample) {
      setInputText(sample.transcript);
      setFileName(`${sample.name} (Sample)`);
      setValidationNote(null);
    }
  };

  const lineCount = inputText ? inputText.split('\n').filter((l) => l.trim()).length : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      {/* Brand Header — Crimson Protocol Aesthetic */}
      <header className="text-center mb-8 sm:mb-10 relative">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 bg-[#FF2638] rounded-none rotate-45" />
          <span className="font-display font-bold text-2xl sm:text-3xl tracking-wider text-[#F4F5F7] uppercase">
            UNMISSED
          </span>
          <span className="text-[10px] tracking-widest font-mono text-[#FF2638] font-bold uppercase ml-1 border border-[#FF2638]/40 px-1.5 py-0.5 rounded-none bg-[#FF2638]/10">
            PROTOCOL
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F4F5F7] mb-2 font-display">
          WHAT DID YOU <span className="text-[#FF2638] relative inline-block">MISS?</span>
        </h1>
        
        <p className="text-sm sm:text-base text-[#B7BBC4] font-normal max-w-md mx-auto">
          Your conversations, minus the noise.
        </p>

        {/* Faint Crimson Divider Rule */}
        <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-[#FF2638]/60 to-transparent mx-auto mt-4" />
      </header>

      {/* Main Input Surface — Charcoal Card #121419 with Border #303139 */}
      <div className="bg-[#121419] rounded-xl border border-[#303139] p-5 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.4)] relative">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label 
                htmlFor="conversation-input" 
                className="text-[11px] font-semibold text-[#B7BBC4] uppercase tracking-wider flex items-center gap-1.5 font-mono"
              >
                <Terminal className="w-3.5 h-3.5 text-[#FF2638]" />
                <span>Conversation Transcript</span>
              </label>
              {lineCount > 0 && (
                <span className="text-[11px] font-mono text-[#9AA0AA]">
                  {lineCount} {lineCount === 1 ? 'message' : 'messages'} detected
                </span>
              )}
            </div>

            <textarea
              id="conversation-input"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setValidationNote(null);
              }}
              rows={9}
              placeholder="Paste conversation lines here, or upload an exported WhatsApp .txt file below..."
              className="w-full bg-[#08090B] text-[#F4F5F7] border border-[#303139] rounded-lg p-3.5 text-sm font-mono-clean focus:outline-none focus:border-[#FF2638] focus:ring-1 focus:ring-[#FF2638]/50 transition-all leading-relaxed placeholder:text-[#9AA0AA]/50 resize-y"
              disabled={isLoading}
            />
          </div>

          {/* Upload and Clear Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#303139]">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.log"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 text-xs text-[#B7BBC4] hover:text-[#F4F5F7] bg-[#191B21] hover:bg-[#20222A] font-medium py-1.5 px-3 rounded-md transition-colors cursor-pointer border border-[#303139] hover:border-[#FF2638]/50"
            >
              <Upload className="w-3.5 h-3.5 text-[#FF2638]" />
              <span>{fileName ? `File: ${fileName}` : 'Upload WhatsApp .txt export'}</span>
            </button>

            {inputText && (
              <button
                type="button"
                onClick={() => {
                  setInputText('');
                  setFileName(null);
                  setValidationNote(null);
                }}
                className="text-xs text-[#9AA0AA] hover:text-[#FF5260] font-medium cursor-pointer transition-colors"
              >
                Clear text
              </button>
            )}
          </div>

          {/* Processing Mode Toggle — Elevated surface #191B21 */}
          <div className="bg-[#191B21] border border-[#303139] rounded-lg p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#F4F5F7] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#FF2638]" />
                <span className="text-[11px] uppercase tracking-wider text-[#B7BBC4] font-mono">Processing Mode:</span>
              </span>

              <div className="inline-flex rounded-md border border-[#303139] p-0.5 bg-[#08090B]">
                <button
                  type="button"
                  onClick={() => setUseCloud(false)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                    !useCloud
                      ? 'bg-[#FF2638] text-white shadow-[0_0_12px_rgba(255,38,56,0.35)]'
                      : 'text-[#9AA0AA] hover:text-[#F4F5F7]'
                  }`}
                >
                  <Cpu className="w-3 h-3" />
                  <span>On-Device (Private)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUseCloud(true)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                    useCloud
                      ? 'bg-[#FF2638] text-white shadow-[0_0_12px_rgba(255,38,56,0.35)]'
                      : 'text-[#9AA0AA] hover:text-[#F4F5F7]'
                  }`}
                >
                  <Cloud className="w-3 h-3" />
                  <span>Cloud AI (Gemini)</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-[#9AA0AA] leading-relaxed">
              {!useCloud ? (
                <>
                  <strong className="text-[#F4F5F7]">100% On-Device:</strong> Content never leaves your browser. Parsing and evidence extraction run locally.
                </>
              ) : (
                <>
                  <strong className="text-[#F4F5F7]">Cloud Assisted:</strong> Text is transmitted securely to Gemini API for synthesis. Content is not stored.
                </>
              )}
            </p>
          </div>

          {/* Validation or API Error Alert */}
          {(validationNote || errorMessage) && (
            <div className="bg-[#FF2638]/10 text-[#FF5260] border border-[#FF2638]/30 rounded-lg p-3 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#FF2638]" />
              <span>{validationNote || errorMessage}</span>
            </div>
          )}

          {/* Primary Action Button — Vivid Crimson #FF2638 with hover #FF5260 & subtle glow */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#FF2638] hover:bg-[#FF5260] active:bg-[#D91B2C] text-[#FFFFFF] font-semibold text-sm py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-wait shadow-[0_2px_14px_rgba(255,38,56,0.35)] hover:shadow-[0_4px_20px_rgba(255,38,56,0.5)]"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Scanning conversation stream...</span>
                </>
              ) : (
                <>
                  <span className="uppercase tracking-wide font-display">Find what I missed</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Visible, Unobtrusive Privacy Note */}
        <p className="text-center text-xs text-[#9AA0AA] mt-4 leading-normal font-mono text-[11px]">
          UNMISSED analyzes only the conversation provided. No account access or external connections.
        </p>
      </div>

      {/* Synthetic Sample Triggers */}
      <div className="mt-8 pt-6 border-t border-[#303139]">
        <div className="text-[11px] font-semibold text-[#9AA0AA] uppercase tracking-wider mb-2.5 font-mono flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-[#FF2638]" />
          <span>Or test with sample conversations:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {SYNTHETIC_SAMPLES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleLoadSample(sample.id)}
              disabled={isLoading}
              className="text-left p-3 bg-[#121419] hover:bg-[#191B21] border border-[#303139] hover:border-[#FF2638]/40 rounded-lg transition-all group cursor-pointer"
            >
              <div className="text-xs font-semibold text-[#F4F5F7] group-hover:text-[#FF5260] transition-colors">
                {sample.name}
              </div>
              <div className="text-[11px] text-[#9AA0AA] line-clamp-1 mt-0.5 font-normal">
                {sample.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
