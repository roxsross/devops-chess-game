export function Footer() {
  return (
    <footer className="w-full border-t border-[rgba(255,255,255,0.06)] py-4 px-4 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#8892a4]">
        <span>
          ♟ <span className="text-[#eaeaea] font-medium">Chess Master</span> — real-time chess with Stockfish AI
        </span>
        <span>
          Built by{' '}
          <a
            href="https://github.com/roxsross"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#e2b96f] hover:opacity-80 transition-opacity font-medium"
          >
            roxs
          </a>
          {' '}· Powered by AWS
        </span>
      </div>
    </footer>
  );
}
