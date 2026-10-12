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
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-700 font-medium">
            <Terminal className="w-3.5 h-3.5" />
            <span>Interview Gateway Access</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Join Live Assessment
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Enter the unique 6-character room code after INT- provided by your company.
          </p>
        </div>

        {/* Join Box */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-700 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                  className="w-full px-4 py-3 text-base font-mono tracking-widest bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-lg text-slate-900 uppercase text-center font-bold"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 px-1">
                <span>Format: INT-XXXXXX</span>
                <span>Example: INT-8A9F3C</span>
              </div>
            </div>

            {/* Preflight Checklist */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-[11px] text-slate-600">
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pre-flight Checklist</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Webcam and microphone permissions enabled</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Fullscreen browser mode ready</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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
        <div className="text-center text-xs text-slate-500">
          <Link to="/dashboard" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
            &larr; Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
