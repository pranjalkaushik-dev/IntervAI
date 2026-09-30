import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Laptop,
  Server,
  Cpu,
  Database,
  Zap,
  Layers,
  Network,
  HardDrive,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Move,
  ArrowRight,
  FileText
} from 'lucide-react';
import interviewApi from '../../api/interviewApi';
import Button from '../ui/Button';

const COMPONENT_TYPES = [
  { type: 'CLIENT', label: 'Client / User', icon: Laptop, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { type: 'API_GATEWAY', label: 'API Gateway', icon: Network, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { type: 'SERVICE', label: 'Microservice', icon: Cpu, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { type: 'DATABASE', label: 'Database (SQL/NoSQL)', icon: Database, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { type: 'CACHE', label: 'Cache (Redis)', icon: Zap, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { type: 'QUEUE', label: 'Message Queue', icon: Layers, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { type: 'LOAD_BALANCER', label: 'Load Balancer', icon: Server, color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  { type: 'STORAGE', label: 'Object Storage', icon: HardDrive, color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
];

export default function SystemDesignCanvas({
  interviewId,
  question,
  socket,
  roomCode,
  isCompany,
  onSubmitted
}) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [diagramNotes, setDiagramNotes] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [connectSourceId, setConnectSourceId] = useState(null);
  const [activeTool, setActiveTool] = useState('select'); // 'select', 'connect', 'delete'
  
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [zoom, setZoom] = useState(1);
  
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiEval, setAiEval] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const canvasRef = useRef(null);
  const draggingNodeRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Load existing System Design state
  useEffect(() => {
    if (interviewId) {
      loadState();
    }
  }, [interviewId]);

  const loadState = async () => {
    try {
      const res = await interviewApi.getSystemDesignState(interviewId);
      const data = res.data?.systemDesign;
      if (data) {
        if (Array.isArray(data.nodes)) setNodes(data.nodes);
        if (Array.isArray(data.edges)) setEdges(data.edges);
        if (data.diagramNotes) setDiagramNotes(data.diagramNotes);
        if (data.aiEvaluation) setAiEval(data.aiEvaluation);
      }
    } catch (_) {}
  };

  // Push state to history stack for Undo/Redo
  const pushHistory = (newNodes, newEdges) => {
    const nextHistory = history.slice(0, historyIdx + 1);
    nextHistory.push({ nodes: JSON.parse(JSON.stringify(newNodes)), edges: JSON.parse(JSON.stringify(newEdges)) });
    setHistory(nextHistory);
    setHistoryIdx(nextHistory.length - 1);
  };

  // Broadcast real-time canvas updates via Socket.IO
  const broadcastChange = useCallback((updatedNodes, updatedEdges, notes) => {
    if (socket && roomCode) {
      socket.emit('system-design:change', {
        roomId: roomCode,
        nodes: updatedNodes,
        edges: updatedEdges,
        diagramNotes: notes !== undefined ? notes : diagramNotes
      });
    }
  }, [socket, roomCode, diagramNotes]);

  // Socket.IO Listener for live collaboration updates
  useEffect(() => {
    if (!socket) return;

    const handleRemoteUpdate = (payload) => {
      if (payload) {
        if (Array.isArray(payload.nodes)) setNodes(payload.nodes);
        if (Array.isArray(payload.edges)) setEdges(payload.edges);
        if (payload.diagramNotes !== undefined) setDiagramNotes(payload.diagramNotes);
      }
    };

    socket.on('system-design:update', handleRemoteUpdate);
    return () => {
      socket.off('system-design:update', handleRemoteUpdate);
    };
  }, [socket]);

  // Add component node to canvas
  const handleAddComponent = (compType) => {
    const comp = COMPONENT_TYPES.find(c => c.type === compType);
    const newNode = {
      id: `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: compType,
      label: comp ? comp.label : compType,
      x: 100 + (nodes.length % 5) * 40,
      y: 100 + (nodes.length % 5) * 30,
      notes: ''
    };

    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    pushHistory(nextNodes, edges);
    broadcastChange(nextNodes, edges);
  };

  // Node Drag Handlers
  const handleNodeMouseDown = (e, nodeId) => {
    if (activeTool === 'connect') {
      if (!connectSourceId) {
        setConnectSourceId(nodeId);
      } else if (connectSourceId !== nodeId) {
        // Create edge from connectSourceId to nodeId
        const newEdge = {
          id: `edge-${connectSourceId}-${nodeId}`,
          from: connectSourceId,
          to: nodeId,
          label: 'HTTP/RPC'
        };

        const edgeExists = edges.some(e => e.from === connectSourceId && e.to === nodeId);
        if (!edgeExists) {
          const nextEdges = [...edges, newEdge];
          setEdges(nextEdges);
          pushHistory(nodes, nextEdges);
          broadcastChange(nodes, nextEdges);
        }
        setConnectSourceId(null);
      }
      return;
    }

    if (activeTool === 'delete') {
      handleDeleteNode(nodeId);
      return;
    }

    setSelectedNodeId(nodeId);
    draggingNodeRef.current = nodeId;
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      dragOffsetRef.current = { x: e.clientX - node.x, y: e.clientY - node.y };
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!draggingNodeRef.current) return;
    const nodeId = draggingNodeRef.current;
    const newX = Math.max(10, e.clientX - dragOffsetRef.current.x);
    const newY = Math.max(10, e.clientY - dragOffsetRef.current.y);

    setNodes(prev => {
      const next = prev.map(n => n.id === nodeId ? { ...n, x: newX, y: newY } : n);
      broadcastChange(next, edges);
      return next;
    });
  };

  const handleCanvasMouseUp = () => {
    if (draggingNodeRef.current) {
      draggingNodeRef.current = null;
      pushHistory(nodes, edges);
    }
  };

  const handleDeleteNode = (nodeId) => {
    const nextNodes = nodes.filter(n => n.id !== nodeId);
    const nextEdges = edges.filter(e => e.from !== nodeId && e.to !== nodeId);
    setNodes(nextNodes);
    setEdges(nextEdges);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    pushHistory(nextNodes, nextEdges);
    broadcastChange(nextNodes, nextEdges);
  };

  const handleDeleteEdge = (edgeId) => {
    const nextEdges = edges.filter(e => e.id !== edgeId);
    setEdges(nextEdges);
    pushHistory(nodes, nextEdges);
    broadcastChange(nodes, nextEdges);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIdx > 0) {
      const prevIdx = historyIdx - 1;
      const state = history[prevIdx];
      setNodes(state.nodes);
      setEdges(state.edges);
      setHistoryIdx(prevIdx);
      broadcastChange(state.nodes, state.edges);
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const nextIdx = historyIdx + 1;
      const state = history[nextIdx];
      setNodes(state.nodes);
      setEdges(state.edges);
      setHistoryIdx(nextIdx);
      broadcastChange(state.nodes, state.edges);
    }
  };

  const handleClearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    pushHistory([], []);
    broadcastChange([], []);
  };

  // Save Architecture Draft
  const handleSaveState = async () => {
    if (!interviewId) return;
    setSaving(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      await interviewApi.saveSystemDesignState(interviewId, {
        questionId: question?._id || null,
        nodes,
        edges,
        diagramNotes
      });
      setStatusMsg('Architecture draft saved successfully.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  // Submit Architecture for AI Evaluation
  const handleSubmitArchitecture = async () => {
    if (!interviewId) return;
    setSubmitting(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      const res = await interviewApi.submitSystemDesign(interviewId, {
        questionId: question?._id || null,
        questionPrompt: question?.prompt || 'System Design Interview Problem',
        nodes,
        edges,
        diagramNotes
      });

      if (res.data?.success) {
        setStatusMsg('Architecture submitted! AI evaluation completed.');
        if (res.data?.systemDesign?.aiEvaluation) {
          setAiEval(res.data.systemDesign.aiEvaluation);
        }
        if (onSubmitted) onSubmitted(res.data?.systemDesign);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit architecture');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              SYSTEM DESIGN WHITEBOARD
            </span>
            <span className="text-xs text-slate-400 font-mono">Live Sync Active</span>
          </div>
          <h2 className="text-base font-semibold text-slate-100 mt-1">
            {question?.prompt || 'System Design Problem Statement'}
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={handleSaveState} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Save Draft
          </Button>

          {!isCompany && (
            <Button
              size="sm"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium"
              onClick={handleSubmitArchitecture}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Evaluating Architecture...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1" /> Submit & Evaluate
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Canvas Workspace & Toolbar */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Component Palette Sidebar */}
        <div className="w-56 bg-slate-900/90 border-r border-slate-800 p-3 overflow-y-auto space-y-3 shrink-0">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Architecture Components
          </div>
          <div className="space-y-1.5">
            {COMPONENT_TYPES.map((comp) => {
              const IconComp = comp.icon;
              return (
                <button
                  key={comp.type}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg border transition-all ${comp.color} hover:brightness-125`}
                  onClick={() => handleAddComponent(comp.type)}
                >
                  <IconComp className="w-4 h-4 shrink-0" />
                  <span className="font-medium truncate">{comp.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Tools & Mode
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              className={`p-2 text-xs rounded-lg border flex flex-col items-center justify-center gap-1 ${activeTool === 'select' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
              onClick={() => { setActiveTool('select'); setConnectSourceId(null); }}
            >
              <Move className="w-4 h-4" /> Move/Select
            </button>

            <button
              className={`p-2 text-xs rounded-lg border flex flex-col items-center justify-center gap-1 ${activeTool === 'connect' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
              onClick={() => setActiveTool('connect')}
            >
              <ArrowRight className="w-4 h-4" /> Connect
            </button>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-slate-400">
            <button className="p-1.5 hover:bg-slate-800 rounded text-xs" onClick={handleUndo} title="Undo">
              <Undo2 className="w-4 h-4" />
            </button>
            <button className="p-1.5 hover:bg-slate-800 rounded text-xs" onClick={handleRedo} title="Redo">
              <Redo2 className="w-4 h-4" />
            </button>
            <button className="p-1.5 hover:bg-slate-800 rounded text-xs" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button className="p-1.5 hover:bg-slate-800 rounded text-xs" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button className="p-1.5 hover:bg-slate-800 text-red-400 hover:text-red-300 rounded text-xs" onClick={handleClearCanvas} title="Clear Canvas">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SVG Interactive Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 bg-slate-950 relative overflow-hidden cursor-crosshair select-none"
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          style={{
            backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        >
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: '100%', height: '100%' }}>
            {/* SVG Layer for Connecting Arrow Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#818cf8" />
                </marker>
              </defs>

              {edges.map((edge) => {
                const fromNode = nodes.find(n => n.id === edge.from);
                const toNode = nodes.find(n => n.id === edge.to);
                if (!fromNode || !toNode) return null;

                const x1 = fromNode.x + 80;
                const y1 = fromNode.y + 25;
                const x2 = toNode.x + 80;
                const y2 = toNode.y + 25;

                return (
                  <g key={edge.id} className="pointer-events-auto cursor-pointer" onClick={() => handleDeleteEdge(edge.id)}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#818cf8"
                      strokeWidth="2.5"
                      markerEnd="url(#arrowhead)"
                      strokeDasharray="4"
                    />
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 - 6}
                      fill="#a5b4fc"
                      fontSize="11"
                      textAnchor="middle"
                      className="bg-slate-900 px-1"
                    >
                      {edge.label || ''}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Nodes Layer */}
            {nodes.map((node) => {
              const comp = COMPONENT_TYPES.find(c => c.type === node.type) || COMPONENT_TYPES[0];
              const IconComp = comp.icon;
              const isSelected = selectedNodeId === node.id;
              const isConnectSource = connectSourceId === node.id;

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  style={{ left: `${node.x}px`, top: `${node.y}px` }}
                  className={`absolute z-10 w-44 p-3 rounded-xl border shadow-xl transition-shadow flex items-center gap-2.5 cursor-grab active:cursor-grabbing ${comp.color} ${isSelected ? 'ring-2 ring-indigo-400 border-indigo-400' : ''} ${isConnectSource ? 'ring-2 ring-amber-400 border-amber-400 animate-pulse' : ''}`}
                >
                  <IconComp className="w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={node.label}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes(nodes.map(n => n.id === node.id ? { ...n, label: val } : n));
                        broadcastChange(nodes.map(n => n.id === node.id ? { ...n, label: val } : n), edges);
                      }}
                      className="bg-transparent text-xs font-semibold text-slate-100 focus:outline-none w-full border-b border-transparent focus:border-slate-500"
                    />
                    <span className="text-[10px] text-slate-400 block truncate">{comp.type}</span>
                  </div>

                  <button
                    className="text-slate-400 hover:text-red-400 p-1 rounded"
                    onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Node Details & Notes Sidebar */}
        <div className="w-64 bg-slate-900/90 border-l border-slate-800 p-4 space-y-4 overflow-y-auto shrink-0 text-xs">
          <div>
            <h4 className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-400" /> Architectural Design Notes
            </h4>
            <textarea
              rows={6}
              value={diagramNotes}
              onChange={(e) => {
                const val = e.target.value;
                setDiagramNotes(val);
                broadcastChange(nodes, edges, val);
              }}
              placeholder="Explain your system architecture, data flow, caching strategy, and trade-offs..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          {selectedNode && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="font-semibold text-slate-300">Selected Node Details</span>
              <div>
                <label className="text-[10px] text-slate-400">Node Label</label>
                <input
                  type="text"
                  value={selectedNode.label}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, label: val } : n));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-200 text-xs mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400">Node Component Notes</label>
                <input
                  type="text"
                  value={selectedNode.notes || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, notes: val } : n));
                  }}
                  placeholder="e.g. Redis Cluster (3 shards)"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-slate-200 text-xs mt-1"
                />
              </div>
            </div>
          )}

          {/* AI Architecture Evaluation Breakdown */}
          {aiEval && (
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <Sparkles className="w-4 h-4" /> AI Architecture Evaluation
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400">Overall</span>
                  <div className="text-base font-bold text-emerald-400">{aiEval.overallScore}/100</div>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400">Scalability</span>
                  <div className="text-base font-bold text-indigo-400">{aiEval.scalabilityScore}/100</div>
                </div>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950 p-2 rounded border border-slate-800">
                {aiEval.summary}
              </p>

              {aiEval.strengths && aiEval.strengths.length > 0 && (
                <div>
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase">Strengths</span>
                  <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5 mt-1">
                    {aiEval.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              {aiEval.bottlenecks && aiEval.bottlenecks.length > 0 && (
                <div>
                  <span className="text-[10px] font-semibold text-amber-400 uppercase">Bottlenecks</span>
                  <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5 mt-1">
                    {aiEval.bottlenecks.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
