import { Link } from 'react-router-dom';

const DISCORD_URL = 'https://discord.gg/KeGKQjKPN5';

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-domain-panel-border/60 bg-domain-dark/60 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="font-ui text-xs text-domain-text-dim">
          © {new Date().getFullYear()} <span className="text-domain-parchment-dark md:text-eg4h-gold-dark">Evil Genius 4 Hire</span>
        </p>
        <nav className="flex items-center gap-5 font-ui text-xs">
          <Link
            to="/changelog"
            className="text-domain-text-dim hover:text-eg4h-gold transition-colors"
          >
            Changelog
          </Link>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-domain-text-dim hover:text-eg4h-gold transition-colors"
          >
            Discord
          </a>
        </nav>
      </div>
    </footer>
  );
}
