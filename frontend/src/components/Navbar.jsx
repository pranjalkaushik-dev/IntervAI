import React, { useState } from 'react';
import { 
  Code2, 
  Users, 
  Radio, 
  Copy, 
  Check, 
  ExternalLink, 
  LogIn, 
  ShieldCheck, 
  Laptop
} from 'lucide-react';

export const Navbar = ({ 
  roomId, 
  onRoomChange, 
  isConnected, 
  participants = [], 
  currentUser,
  onUserChange
}) => {
  const [copied, setCopied] = useState(false);
  const [inputRoom, setInputRoom] = useState(roomId);
  const [isEditingRoom, setIsEditingRoom] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenSplitTab = () => {
    const url = `${window.location.origin}?room=${roomId}&user=Student-Alex`;
    window.open(url, '_blank', 'width=900,height=800');
  };

  const handleRoomSubmit = (e) => {
    e.preventDefault();
    if (inputRoom.trim() && inputRoom.trim() !== roomId) {
      onRoomChange(inputRoom.trim().toUpperCase());
    }
    setIsEditingRoom(false);
  };

  return (
    <header className="navbar-container">
      <div className="nav-left">
        <div className="logo-group">
          <div className="logo-icon-box">
            <Code2 size={22} className="text-accent" />
          </div>
          <div className="logo-text">
            <span className="brand-title">CodeSync Live</span>
            <span className="brand-badge">Interview Edition</span>
          </div>
        </div>

        {/* Room Switcher */}
        <div className="room-badge-group">
          <span className="room-label">Room:</span>
          {isEditingRoom ? (
            <form onSubmit={handleRoomSubmit} className="room-edit-form">
              <input
                type="text"
                value={inputRoom}
                onChange={(e) => setInputRoom(e.target.value.toUpperCase())}
                placeholder="INT-XXXX"
                className="room-input"
                autoFocus
              />
              <button type="submit" className="room-save-btn">Join</button>
            </form>
          ) : (
            <div className="room-display" onClick={() => setIsEditingRoom(true)} title="Click to switch room">
              <span className="room-code">{roomId}</span>
              <span className="room-edit-hint">edit</span>
            </div>
          )}

          <button 
            onClick={handleCopyLink} 
            className="icon-btn" 
            title="Copy Invite Link"
          >
            {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
          </button>

          <button 
            onClick={handleOpenSplitTab} 
            className="split-tab-btn" 
            title="Open 2nd Screen to test Live Typing Sync"
          >
            <ExternalLink size={14} />
            <span>Test 2nd Screen</span>
          </button>
        </div>
      </div>

      <div className="nav-right">
        {/* Socket Status Indicator */}
        <div className={`status-pill ${isConnected ? 'status-online' : 'status-offline'}`}>
          <Radio size={14} className={isConnected ? 'pulse-icon' : ''} />
          <span>{isConnected ? 'Socket.IO Live' : 'Reconnecting...'}</span>
        </div>

        {/* Participants Pill */}
        <div className="participants-pill" title={`${participants.length} Active in Room`}>
          <Users size={16} />
          <span>{participants.length}</span>
          <div className="participants-dots">
            {participants.slice(0, 3).map((p, idx) => (
              <span key={p.socketId || idx} className="avatar-dot" title={p.userName || 'Peer'}>
                {(p.userName || 'P').charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
        </div>

        {/* User Badge */}
        <div className="user-badge" title="Active Identity">
          <ShieldCheck size={16} className="text-accent" />
          <span className="user-name">{currentUser.name}</span>
          <span className="user-role-badge">{currentUser.role}</span>
        </div>
      </div>
    </header>
  );
};
