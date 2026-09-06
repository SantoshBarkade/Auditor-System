import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle2, Play, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { api } from '../services/api';

export default function Configurations({ onAuditStarted }) {
  const [rawContent, setRawContent] = useState('');
  const [filename, setFilename] = useState('cisco_insecure.cfg');
  const [detection, setDetection] = useState(null);
  const [sampleConfigs, setSampleConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    async function loadSamples() {
      try {
        const samples = await api.getSampleConfigsList();
        setSampleConfigs(samples);
        if (samples.length > 0) {
          handleLoadSample('cisco_insecure.cfg');
        }
      } catch (err) {
        console.error("Failed to load samples", err);
      }
    }
    loadSamples();
  }, []);

  async function handleContentChange(text, fname = filename) {
    setRawContent(text);
    if (text.trim().length > 10) {
      setDetecting(true);
      try {
        const det = await api.detectVendor(text, fname);
        setDetection(det);
      } catch (err) {
        console.error("Detection error", err);
      } finally {
        setDetecting(false);
      }
    } else {
      setDetection(null);
    }
  }

  async function handleLoadSample(fname) {
    try {
      const data = await api.loadSampleConfig(fname);
      setFilename(fname);
      setRawContent(data.raw_content);
      setDetection(data.detection);
    } catch (err) {
      alert("Failed to load sample: " + err.message);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      handleContentChange(content, file.name);
    };
    reader.readAsText(file);
  }

  async function handleStartAudit() {
    if (!rawContent.trim()) {
      alert("Please upload or paste a configuration first.");
      return;
    }

    setLoading(true);
    try {
      const configRes = await api.uploadConfiguration(rawContent, filename, detection?.vendor);
      const auditRes = await api.runAudit(configRes.id);
      if (onAuditStarted) {
        onAuditStarted(auditRes.audit_id);
      }
    } catch (err) {
      alert("Audit launch failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-12 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Configuration Ingestion</h1>
          <p className="text-slate-500 text-lg leading-relaxed">
            Supply raw proprietary network configuration to initiate deterministic compliance modeling.
          </p>
        </div>

        <button
          onClick={handleStartAudit}
          disabled={loading || !rawContent.trim()}
          className="flex items-center space-x-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm uppercase tracking-widest transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Initializing Engine...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Execute Audit Pipeline</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-px bg-slate-200 border border-slate-200">
        
        {/* LEFT COLUMN: Input Area */}
        <div className="lg:col-span-3 bg-white flex flex-col">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Samples:</span>
              {sampleConfigs.map((s) => {
                const isSelected = filename === s.filename;
                return (
                  <button
                    key={s.filename}
                    onClick={() => handleLoadSample(s.filename)}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
            
            <label className="cursor-pointer flex items-center space-x-2 px-4 py-1.5 border border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Config</span>
              <input type="file" accept=".cfg,.conf,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
          
          <div className="flex items-center justify-between px-6 py-2 bg-slate-900 border-b border-slate-800">
            <span className="text-xs font-mono text-slate-400">File: <span className="text-slate-100">{filename}</span></span>
            <span className="text-[10px] text-slate-500 font-mono">Lines: {rawContent.split('\n').length}</span>
          </div>

          <textarea
            value={rawContent}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Paste running-configuration here..."
            className="flex-1 w-full bg-slate-950 p-6 font-mono text-xs text-slate-300 focus:outline-none resize-none leading-relaxed h-[600px] border-none"
            spellCheck={false}
          />
        </div>

        {/* RIGHT COLUMN: Vendor Fingerprinting */}
        <div className="bg-white flex flex-col">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Fingerprinting</h3>
            {detecting && <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
          </div>
          
          <div className="flex-1 p-6">
            {detection ? (
              <div className="space-y-8">
                <div className="space-y-1 pb-6 border-b border-slate-200">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Detected OS Platform</div>
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">{detection.vendor}</div>
                </div>

                <div className="space-y-1 pb-6 border-b border-slate-200">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Confidence Score</div>
                  <div className="text-3xl font-bold font-mono text-slate-900">{Math.round(detection.confidence * 100)}%</div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Identified Tokens ({detection.fingerprints?.length || 0})</div>
                  <div className="space-y-2">
                    {detection.fingerprints?.map((f, i) => (
                      <div key={i} className="flex items-start space-x-2 text-xs text-slate-600 bg-slate-50 p-3 border border-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center space-y-4 py-12 text-slate-400">
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm">Provide configuration payload to trigger semantic recognition.</p>
              </div>
            )}
          </div>
          
          <div className="p-6 bg-slate-900 text-white">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Deterministic Invariant</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Classification relies on structural AST token validation rather than probabilistic guessing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
