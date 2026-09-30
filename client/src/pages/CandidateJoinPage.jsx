import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import interviewApi from '../api/interviewApi';
import { Terminal, Shield, ArrowRight, Video, Mic, CheckCircle2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

export default function StudentJoinPage() {
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    let val = e.target.value.toUpperCase();
    if (val.length > 0 && !val.startsWith('INT-') && !'INT-'.startsWith(val)) {
      val = 'INT-' + val.replace(/^INT-?/, '');
    }
    setRoomCode(val);
    if (error) setError('');
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a valid 6-character room code after INT- (e.g. INT-8A9F).');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await interviewApi.previewInterview(cleanCode);
      console.log('[StudentJoin] API response:', response);
      const interview = response.data?.interview;
      navigate(`/waiting/${interview.roomCode}`);
    } catch (err) {
      setError(err.message || 'Could not find or join room. Please check the code with your company.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Terminal Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-arena-surface border border-arena-border text-xs text-blue-400">
            <Terminal className="w-3.5 h-3.5" />
            <span>Interview Gateway Access</span>
          </div>
          <h1 className="text-2xl font-bold text-white font-display">
            Join Live Assessment
          </h1>
          <p className="text-xs text-arena-muted max-w-xs mx-auto">
            Enter the unique 6-character room code after INT- provided by your company.
          </p>
        </div>

        {/* Join Box */}
        <div className="bg-arena-surface border border-arena-border rounded-xl shadow-editor p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-md text-rose-300 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Session Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={roomCode}
                  onChange={handleInputChange}
                  placeholder="INT-XXXX"
                  maxLength={10}
                  autoFocus
                  className="w-full px-4 py-3 text-base font-mono tracking-widest bg-arena-panel border border-arena-border focus:border-arena-blue focus:ring-1 focus:ring-arena-blue rounded-lg text-white uppercase text-center font-bold"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-arena-dim mt-1.5 px-1">
                <span>Format: INT-XXXXXX</span>
                <span>Example: INT-8A9F3C</span>
              </div>
            </div>

            {/* Preflight Checklist */}
            <div className="p-3 rounded-lg bg-arena-panel/60 border border-arena-border space-y-2 text-[11px] text-arena-muted">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pre-flight Checklist</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Webcam and microphone permissions enabled</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Fullscreen browser mode ready</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Secondary mobile camera pairing optional</span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              disabled={!roomCode.trim()}
              icon={ArrowRight}
            >
              {isLoading ? 'Verifying Session...' : 'Continue to System Check'}
            </Button>
          </form>
        </div>

        {/* Back navigation */}
        <div className="text-center text-xs text-arena-dim">
          <Link to="/dashboard" className="text-arena-muted hover:text-white transition-colors">
            &larr; Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
