import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Camera, CheckCircle2, ChevronLeft, Clock3, Maximize2, Mic, ShieldCheck, Smartphone, Wifi, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import interviewApi from '../api/interviewApi';
import { isInterviewActive } from '../utils/interviewStatus';

const CHECKS = [
  ['camera', 'Camera', 'Camera permission and video preview'],
  ['microphone', 'Microphone', 'Microphone permission and input'],
  ['browser', 'Browser', 'Modern browser and secure context'],
  ['fullscreen', 'Fullscreen', 'Ready to enter fullscreen mode'],
];

export default function StudentWaitingRoom() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { isStudent } = useAuth();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checks, setChecks] = useState({ camera: 'checking', microphone: 'checking', browser: 'checking', fullscreen: 'ready' });
  const [micLevel, setMicLevel] = useState(0);
  const [entering, setEntering] = useState(false);
  const [fullscreenReady, setFullscreenReady] = useState(false);

  const normalizedRoom = useMemo(() => String(roomCode || '').toUpperCase(), [roomCode]);

  useEffect(() => {
    if (!isStudent) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const response = await interviewApi.previewInterview(normalizedRoom);
        if (!cancelled) setInterview(response?.data?.interview || null);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || err?.message || 'Unable to load this interview.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [normalizedRoom, isStudent]);

  useEffect(() => {
    if (!isStudent || !normalizedRoom) return;
    const timer = setInterval(async () => {
      try {
        const response = await interviewApi.previewInterview(normalizedRoom);
        const next = response?.data?.interview;
        if (next) setInterview(next);
      } catch (_) {}
    }, 4000);
    return () => clearInterval(timer);
  }, [isStudent, normalizedRoom]);

  useEffect(() => {
    if (!isStudent) return;
    let cancelled = false;
    let audioContext;
    let analyser;
    let raf;

    const startChecks = async () => {
      setChecks((c) => ({ ...c, browser: window.isSecureContext || location.hostname === 'localhost' ? 'pass' : 'warn' }));
      if (!navigator.mediaDevices?.getUserMedia) {
        setChecks((c) => ({ ...c, camera: 'fail', microphone: 'fail' }));
        setError('Camera and microphone access is not available in this browser.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setChecks({ camera: 'pass', microphone: 'pass', browser: window.isSecureContext || location.hostname === 'localhost' ? 'pass' : 'warn', fullscreen: 'ready' });

        try {
          audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(stream);
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            if (!analyser) return;
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (const value of data) { const n = (value - 128) / 128; sum += n * n; }
            setMicLevel(Math.min(100, Math.round(Math.sqrt(sum / data.length) * 320)));
            raf = requestAnimationFrame(tick);
          };
          tick();
        } catch (_) {}
      } catch (err) {
        setChecks((c) => ({ ...c, camera: 'fail', microphone: 'fail' }));
        setError('Please allow camera and microphone access to continue.');
      }
    };
    startChecks();
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (audioContext) audioContext.close().catch(() => {});
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [isStudent]);

  const requestFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setFullscreenReady(true);
      setChecks((c) => ({ ...c, fullscreen: 'pass' }));
    } catch (_) {
      setFullscreenReady(false);
      setChecks((c) => ({ ...c, fullscreen: 'warn' }));
    }
  };

  const handleEnter = async () => {
    if (!allReady || entering) return;
    if (!isInterviewActive(interview?.status)) {
      setError('The company has not started the interview yet. Please wait here.');
      return;
    }
    try {
      setEntering(true);
      await interviewApi.joinInterview(normalizedRoom);
      sessionStorage.setItem(`intervai:preflight:${normalizedRoom}`, 'complete');
      navigate(`/room/${normalizedRoom}`);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to enter the interview.');
    } finally {
      setEntering(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#f6f8fc] flex items-center justify-center text-slate-600">Loading interview…</div>;
  if (error && !interview) return <div className="min-h-screen bg-[#f6f8fc] flex items-center justify-center"><div className="bg-white border rounded-2xl p-8 max-w-md text-center"><h2 className="text-xl font-semibold text-slate-900">Unable to open interview</h2><p className="mt-2 text-sm text-rose-600">{error}</p><button className="mt-5 px-4 py-2 rounded-lg border" onClick={() => navigate('/join')}>Back</button></div></div>;

  const checkIcon = (state) => state === 'pass' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : state === 'fail' ? <XCircle className="w-4 h-4 text-rose-500" /> : <span className="w-4 h-4 rounded-full border-2 border-slate-300 animate-pulse" />;
  const requiresFullscreen = Boolean(interview?.settings?.requireFullscreen);
  const allReady = checks.camera === 'pass' && checks.microphone === 'pass' && (!requiresFullscreen || checks.fullscreen === 'pass');

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div><div><div className="font-bold text-lg">IntervAI</div><div className="text-[11px] text-slate-400">Secure interview workspace</div></div></div>
        <div className="text-right"><div className="text-xs text-slate-400">ROOM CODE</div><div className="font-mono font-semibold text-blue-600">{normalizedRoom}</div></div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[1.25fr_.75fr] gap-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100"><div className="text-xs font-semibold uppercase tracking-wider text-blue-600">Student waiting room</div><h1 className="text-2xl font-semibold mt-1">Waiting for the interview to start</h1><p className="text-sm text-slate-500 mt-2">Complete the system check below. Your camera and microphone are required before entering the live room.</p></div>
            <div className="p-6 grid md:grid-cols-[1.2fr_.8fr] gap-6">
              <div>
                <div className="relative aspect-video rounded-xl bg-slate-950 overflow-hidden border border-slate-200"><video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"/><div className="absolute left-3 bottom-3 px-2.5 py-1 rounded-md bg-black/60 text-white text-xs flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"/>Camera preview</div></div>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500"><Mic className="w-4 h-4"/>Microphone level <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{width:`${micLevel}%`}}/></div></div>
              </div>
              <div className="space-y-3">
                <div className="font-semibold">System check</div>
                {CHECKS.map(([key,label,desc]) => <div key={key} className="flex gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50"><div className="mt-0.5">{checkIcon(checks[key])}</div><div><div className="text-sm font-medium">{label}</div><div className="text-xs text-slate-500 mt-0.5">{desc}</div></div></div>)}
                <button onClick={requestFullscreen} className="w-full mt-1 h-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium flex items-center justify-center gap-2"><Maximize2 className="w-4 h-4"/>{fullscreenReady ? 'Fullscreen ready' : (requiresFullscreen ? 'Enable fullscreen' : 'Test fullscreen')}</button>
              </div>
            </div>
            {error && <div className="mx-6 mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4"><div className="text-xs text-slate-500 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500"/>Your session will be monitored for interview integrity.</div><button disabled={!allReady || entering} onClick={handleEnter} className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold flex items-center gap-2">{entering ? 'Entering…' : isInterviewActive(interview?.status) ? 'Enter Interview' : 'Waiting for company…'}<ArrowRight className="w-4 h-4"/></button></div>
          </section>

          <aside className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"><div className="flex items-center gap-2 text-blue-600 text-sm font-semibold"><Clock3 className="w-4 h-4"/>Interview details</div><div className="mt-5 space-y-4 text-sm"><div><div className="text-xs text-slate-400">Interview</div><div className="font-semibold mt-1">{interview?.title}</div></div><div><div className="text-xs text-slate-400">Company</div><div className="font-medium mt-1">{interview?.createdBy?.fullName || 'Company'}</div></div><div><div className="text-xs text-slate-400">Duration</div><div className="font-medium mt-1">{interview?.durationMinutes || 60} minutes</div></div><div><div className="text-xs text-slate-400">Type</div><div className="font-medium mt-1">{interview?.interviewType || 'Technical'}</div></div></div></div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"><div className="font-semibold">Before you enter</div><ul className="mt-4 space-y-3 text-xs text-slate-600"><li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/>Keep your face visible and camera enabled.</li><li className="flex gap-2"><Wifi className="w-4 h-4 text-blue-500 shrink-0"/>Use a stable internet connection.</li><li className="flex gap-2"><Smartphone className="w-4 h-4 text-blue-500 shrink-0"/>A secondary phone camera may be paired if enabled.</li><li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-blue-500 shrink-0"/>Tab switching and fullscreen events may be recorded.</li></ul></div>
            <button onClick={() => navigate('/join')} className="w-full h-10 rounded-lg border border-slate-200 bg-white text-sm font-medium flex items-center justify-center gap-2"><ChevronLeft className="w-4 h-4"/>Back to join</button>
          </aside>
        </div>
      </main>
    </div>
  );
}
