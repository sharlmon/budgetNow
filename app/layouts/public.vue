<template>
  <div class="pub">
    <a href="#main" class="skip">Skip to content</a>
    <PublicHeader />
    <main id="main"><slot /></main>
    <PublicFooter />
  </div>
</template>

<style>
.pub { min-height:100dvh; background:#fff; }
.pub .skip { position:absolute; left:-9999px; top:8px; background:var(--ink); color:#fff; padding:8px 14px; border-radius:10px; z-index:50; }
.pub .skip:focus { left:12px; }
.pub main { padding:0; }
.wrap { max-width:1080px; margin:0 auto; padding:0 20px; }
.prose { max-width:720px; margin:0 auto; padding:40px 20px 0; }
.prose h1 { font-size:clamp(1.8rem,5vw,2.5rem); line-height:1.15; letter-spacing:-.03em; margin:0 0 12px; }
.prose h2 { font-size:1.35rem; letter-spacing:-.02em; margin:36px 0 10px; }
.prose h3 { font-size:1.05rem; margin:22px 0 6px; }
.prose p, .prose li { color:#3c3f4a; line-height:1.7; }
.prose ul, .prose ol { padding-left:1.2rem; }
.prose a { color:var(--accent); font-weight:500; }
.prose .meta { color:var(--muted); font-size:.9rem; margin:0 0 24px; }
.prose .note { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:14px 16px; }
.prose table { width:100%; border-collapse:collapse; margin:16px 0; font-size:.95rem; }
.prose th, .prose td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--line); }
.prose th { color:var(--muted); font-weight:600; font-size:.8rem; text-transform:uppercase; letter-spacing:.05em; }
</style>
