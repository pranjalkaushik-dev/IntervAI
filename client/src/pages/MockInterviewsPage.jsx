import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import interviewApi from '../api/interviewApi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input, { Select } from '../components/ui/Input';
import {
  Users,
  Play,
  Share2,
  Sparkles,
  ArrowRight,
  Clock,
} from 'lucide-react';

export default function MockInterviewsPage() {
  const [partnerCode, setPartnerCode] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('dsa');
  const [aiMode, setAiMode] = useState('MIXED');
  const [duration, setDuration] = useState('45');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleStartMock = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await interviewApi.createP2PInterview({ topic: selectedTopic, durationMinutes: duration });
      const roomCode = res.data?.interview?.roomCode;
      if (roomCode) {
        navigate(`/room/${roomCode}`);
      } else {
        setError('Failed to retrieve room code.');
      }
    } catch (e) {
      console.error('Failed to create P2P interview', e);
      setError(e?.response?.data?.message || 'Failed to create room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleStartAiMock = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await interviewApi.createMockInterview({ mode: aiMode, numberOfQuestions: 4 });
      const roomCode = res.data?.interview?.roomCode;
      if (!roomCode) throw new Error('AI mock interview was created without a room code.');
      navigate(`/room/${roomCode}`);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to create AI mock interview.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinMock = (e) => {
    e.preventDefault();
    if (partnerCode.trim()) {
      navigate(`/room/${partnerCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {isLoading && <LoadingSpinner />}
      {error && <ErrorAlert message={error} />}
      {/* Header */}
      <div className="pb-2 border-b border-arena-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white font-display">
            P2P Mock Interviews & Practice
          </h1>
          <p className="text-xs text-arena-muted mt-0.5">
            Practice real technical interview problems with classmates or friends under timed test conditions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white"><div className="w-7 h-7 rounded-md bg-purple-500/10 text-purple-400 flex items-center justify-center"><Sparkles className="w-4 h-4" /></div><span>AI Mock Interview</span></div>
          <p className="text-xs text-arena-muted leading-relaxed">Choose the interview mode and generate questions through the existing Gemini service.</p>
          <Select label="AI interview mode" value={aiMode} onChange={(e) => setAiMode(e.target.value)}>
            <option value="DSA">DSA</option><option value="CORE_CS">Core CS</option><option value="PROJECT">Project</option><option value="MIXED">Mixed</option>
          </Select>
          <Button size="md" className="w-full mt-2" onClick={handleStartAiMock} icon={Sparkles}>Start AI Mock</Button>
        </Card>

        {/* Card 1: Start New Mock Session */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <div className="w-7 h-7 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <span>Create Peer Practice Room</span>
          </div>
          <p className="text-xs text-arena-muted leading-relaxed">
            Generate an instant sandbox room with code editor, automated Judge0 test cases, and video chat to simulate an interview with a partner.
          </p>

          <div className="space-y-3 pt-2">
            <Select
              label="Topic & Problem Category"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
            >
              <option value="dsa">Data Structures & Algorithms (Array, Hash, Trees)</option>
              <option value="system">System Design & API Contracts</option>
              <option value="frontend">Frontend Architecture & React State</option>
            </Select>

            <Select
              label="Session Time Limit"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option value="30">30 Minutes (Quick Round)</option>
              <option value="45">45 Minutes (Standard Technical)</option>
              <option value="60">60 Minutes (Deep Dive)</option>
            </Select>

            <Button
              size="md"
              className="w-full mt-2"
              onClick={handleStartMock}
              icon={Play}
            >
              Launch Practice Room
            </Button>
          </div>
        </Card>

        {/* Card 2: Join Partner's Mock Room */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <span>Join with Partner's Code</span>
          </div>
          <p className="text-xs text-arena-muted leading-relaxed">
            If your partner has already created a practice room, enter their room code here to join immediately.
          </p>

          <form onSubmit={handleJoinMock} className="space-y-3 pt-2">
            <Input
              label="Partner's Room Code"
              placeholder="e.g. MCK-8B1X or INT-8A9F"
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
              className="font-mono uppercase font-bold"
            />

            <Button
              type="submit"
              variant="secondary"
              size="md"
              className="w-full"
              disabled={!partnerCode.trim()}
              icon={ArrowRight}
            >
              Join Partner's Room
            </Button>
          </form>

          <div className="p-3 rounded-lg bg-arena-panel border border-arena-border text-xs text-arena-dim space-y-1">
            <span className="font-semibold text-slate-300">Mock Mode Capabilities:</span>
            <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
              <Badge variant="neutral" size="xs">Live Code Sync</Badge>
              <Badge variant="neutral" size="xs">WebRTC Video/Audio</Badge>
              <Badge variant="neutral" size="xs">Instant Big-O AI</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Suggested Curated Practice Sets */}
      <Card>
        <CardHeader>
          <div className="font-semibold text-sm text-white">Recommended Practice Sets</div>
          <div className="text-xs text-arena-muted">Frequently asked technical interview patterns</div>
        </CardHeader>

        <div className="divide-y divide-arena-border">
          {[
            {
              title: 'Two Sum & Hash Map Optimizations',
              difficulty: 'Medium',
              topics: 'Hash Table, Arrays',
              time: '25m',
            },
            {
              title: 'LRU Cache Design with Doubly Linked List',
              difficulty: 'Hard',
              topics: 'Design, Hash Map, Linked List',
              time: '45m',
            },
            {
              title: 'Valid Parentheses & Stack Patterns',
              difficulty: 'Easy',
              topics: 'Stack, String',
              time: '20m',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-4 flex items-center justify-between gap-4 hover:bg-arena-panel/40 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">{item.title}</span>
                  <Badge
                    variant={
                      item.difficulty === 'Easy'
                        ? 'emerald'
                        : item.difficulty === 'Medium'
                        ? 'amber'
                        : 'rose'
                    }
                    size="xs"
                  >
                    {item.difficulty}
                  </Badge>
                </div>
                <div className="text-[11px] text-arena-dim flex items-center gap-3">
                  <span>Topics: {item.topics}</span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-arena-dim" />
                    Est. {item.time}
                  </span>
                </div>
              </div>

              <Button
                size="xs"
                variant="outline"
                onClick={handleStartMock}
                icon={Play}
              >
                Practice
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
