import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft } from 'lucide-react';
import Footer from '@/components/Footer';
import changelogContent from '@/content/changelog.md?raw';

export default function Changelog() {
  const navigate = useNavigate();

  return (
    <div className="dm-study-bg min-h-screen flex flex-col">
      <header className="border-b border-domain-panel-border/60 bg-domain-dark/90 backdrop-blur-sm sticky top-0 z-20 dm-header-glow relative">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-domain-text-dim hover:text-eg4h-gold transition-colors font-ui text-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <img src="/dmd-logo.png" alt="DMD" className="w-9 h-9" />
            <h1 className="font-cinzel text-lg text-eg4h-gold font-semibold">DM's Domain</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full relative z-10">
        <article className="changelog-prose font-crimson text-domain-text leading-relaxed">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => (
                <h1
                  className="font-cinzel-decorative text-4xl md:text-5xl text-gold-gradient mb-10 leading-tight"
                  {...props}
                />
              ),
              h2: ({ node, ...props }) => (
                <h2
                  className="font-cinzel text-2xl md:text-3xl text-eg4h-gold mt-12 mb-6 pb-2 border-b border-domain-panel-border/60"
                  {...props}
                />
              ),
              h3: ({ node, ...props }) => (
                <h3
                  className="font-cinzel text-lg md:text-xl text-domain-parchment-dark md:text-eg4h-gold-dark mt-8 mb-3 uppercase tracking-wider"
                  {...props}
                />
              ),
              p: ({ node, ...props }) => (
                <p className="text-base md:text-lg text-domain-text mb-4" {...props} />
              ),
              strong: ({ node, ...props }) => (
                <strong
                  className="block font-cinzel text-domain-parchment-dark md:text-eg4h-gold-dark uppercase tracking-wider text-sm mt-6 mb-2"
                  {...props}
                />
              ),
              ul: ({ node, ...props }) => (
                <ul className="space-y-2 mb-6 pl-1" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="text-base md:text-lg text-domain-text leading-relaxed pl-4 relative before:content-['✦'] before:absolute before:left-0 before:text-eg4h-gold/70" {...props} />
              ),
              a: ({ node, ...props }) => (
                <a
                  className="text-eg4h-gold hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                />
              ),
            }}
          >
            {changelogContent}
          </ReactMarkdown>
        </article>
      </main>

      <Footer />
    </div>
  );
}
