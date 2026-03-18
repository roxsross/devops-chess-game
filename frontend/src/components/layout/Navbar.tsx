import { Link, useLocation } from 'react-router-dom';
import { usePlayerStore } from '../../store/playerStore';
import { useUIStore } from '../../store/uiStore';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export function Navbar() {
  const { username, setUsername, isRegistered } = usePlayerStore();
  const { openLeaderboard } = useUIStore();
  const [isEditOpen, setIsEditOpen] = useState(!isRegistered);
  const [inputName, setInputName] = useState(username);
  const location = useLocation();

  const handleSave = () => {
    const trimmed = inputName.trim();
    if (trimmed.length < 2) return;
    setUsername(trimmed);
    setIsEditOpen(false);
  };

  const navLink = (to: string) =>
    `text-sm transition-colors ${
      location.pathname === to
        ? 'text-[#e2b96f] font-medium'
        : 'text-[#8892a4] hover:text-[#eaeaea]'
    }`;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-[rgba(255,255,255,0.08)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 text-[#e2b96f] font-bold text-xl hover:opacity-80 transition-opacity shrink-0"
          >
            ♟ Chess Master
          </Link>

          {/* Nav */}
          <div className="flex items-center gap-2">
            <Link to="/lobby" className={`${navLink('/lobby')} px-3 py-1.5`}>
              Lobby
            </Link>

            {/* Leaderboard button */}
            <button
              onClick={openLeaderboard}
              title="Leaderboard"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#8892a4] hover:text-[#e2b96f] hover:bg-[#0f3460] transition-colors cursor-pointer"
            >
              <span>🏆</span>
              <span className="hidden sm:inline">Leaderboard</span>
            </button>
          </div>

          {/* User */}
          <button
            onClick={() => { setInputName(username); setIsEditOpen(true); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#0f3460] transition-colors cursor-pointer shrink-0"
          >
            <div className="w-7 h-7 rounded-full bg-[#0f3460] flex items-center justify-center text-sm font-bold text-[#e2b96f]">
              {username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <span className="text-sm text-[#eaeaea] hidden sm:inline">{username || 'Set name'}</span>
          </button>
        </div>
      </nav>

      <Modal isOpen={isEditOpen} title="Set Your Name" size="sm">
        <div className="space-y-4">
          <input
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Enter your name (min. 2 chars)"
            maxLength={20}
            className="w-full px-3 py-2 rounded-lg bg-[#0f3460] border border-[rgba(255,255,255,0.08)] text-[#eaeaea] placeholder-[#8892a4] focus:outline-none focus:border-[#e2b96f] text-sm"
            autoFocus
          />
          <Button variant="primary" size="md" onClick={handleSave} className="w-full">
            Let's Play
          </Button>
        </div>
      </Modal>
    </>
  );
}
