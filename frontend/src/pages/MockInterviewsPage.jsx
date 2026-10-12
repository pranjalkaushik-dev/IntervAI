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
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {isLoading && <LoadingSpinner />}
      {error && <ErrorAlert message={error} />}

      {/* Header */}
      <div className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Mock Practice & Peer Interviews
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulate real interview conditions with AI evaluation or live peer collaboration.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: AI Mock Interview */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span>AI Mock Interview</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Select a target technical track and generate a personalized interview with real-time Gemini feedback.
          </p>
          <Select label="Interview Track" value={aiMode} onChange={(e) => setAiMode(e.target.value)}>
            <option value="DSA">Data Structures & Algorithms</option>
            <option value="CORE_CS">Core Computer Science (OS, DBMS, Networks)</option>
            <option value="PROJECT">Project & System Architecture</option>
            <option value="MIXED">Full Technical Stack (Mixed)</option>
          </Select>
          <Button size="md" className="w-full mt-2" onClick={handleStartAiMock} icon={Sparkles}>
            Launch AI Session
          </Button>
        </Card>

        {/* Card 2: Create Peer Practice Room */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <span>Create Peer Practice Room</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Create an instant collaborative room with shared code editor, Judge0 execution, and video communication.
          </p>

          <div className="space-y-3 pt-1">
            <Select
              label="Topic & Category"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
            >
              <option value="dsa">Data Structures & Algorithms (Arrays, Trees, Graphs)</option>
              <option value="system">System Design & API Contracts</option>
              <option value="frontend">Frontend Architecture & React Performance</option>
            </Select>

            <Select
              label="Session Duration"
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
              Launch Peer Room
            </Button>
          </div>
        </Card>
      </div>

      {/* Join Partner's Mock Room */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <Share2 className="w-4 h-4" />
          </div>
          <span>Join Existing Practice Room</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Enter an invitation or room code generated by your peer to enter their sandbox directly.
        </p>

        <form onSubmit={handleJoinMock} className="flex flex-col sm:flex-row gap-3 items-end pt-1">
          <div className="flex-1 w-full">
            <Input
              label="Partner's Room Code"
              placeholder="e.g. INT-8A9F"
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
              className="font-mono uppercase font-bold"
            />
          </div>

          <Button
            type="submit"
            variant="secondary"
            size="md"
            className="w-full sm:w-auto h-10 px-6 shrink-0"
            disabled={!partnerCode.trim()}
            icon={ArrowRight}
          >
            Join Room
          </Button>
        </form>
      </Card>

      {/* Suggested Curated Practice Sets */}
      <Card>
        <CardHeader>
          <div className="font-semibold text-sm text-slate-900">Recommended Practice Problem Sets</div>
          <div className="text-xs text-slate-500">High-frequency interview questions curated for practice</div>
        </CardHeader>

        <div className="divide-y divide-slate-100">
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
              className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">{item.title}</span>
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
                <div className="text-[11px] text-slate-500 flex items-center gap-3">
                  <span>Topics: {item.topics}</span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
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
