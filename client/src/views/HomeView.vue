<script setup lang="ts">
const bootLines = [
  { prompt: '$', text: 'whoami', result: '> 饿师傅 / engineer & daydreamer' },
  {
    prompt: '$',
    text: 'cat /etc/esrs.conf',
    result: '> theme=tianyi-blue  stack=vue3+node+sqlite',
  },
  { prompt: '$', text: 'grep -r "comments" ./', result: '> 0 matches — 保持安静，保持专注。' },
]
</script>

<template>
  <div class="home page">
    <section class="hero container">
      <div class="hero__copy">
        <p class="eyebrow">ESRS.TECH / PERSONAL LOGBOOK</p>
        <h1 class="hero__title">
          把灵感
          <br />
          写成<span class="text-gradient">可复用的代码。</span>
        </h1>
        <p class="hero__lede">
          这里是饿师傅的技术札记。记录工程实践、工具折腾与那些突然闪现的灵感。用天依蓝作底色，把复杂的问题拆成清晰的步骤。
        </p>

        <div class="hero__actions">
          <span class="btn btn--primary is-disabled" aria-disabled="true">文章模块构建中</span>
          <a
            class="btn btn--ghost"
            href="https://github.com"
            target="_blank"
            rel="noreferrer noopener"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.6-4-1.6-.6-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6a4.7 4.7 0 0 1 1.2-3.2 4.4 4.4 0 0 1 .1-3.2s1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5a4.4 4.4 0 0 1 .1 3.2 4.7 4.7 0 0 1 1.2 3.2c0 4.7-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z"
              />
            </svg>
            GitHub
          </a>
        </div>

        <dl class="hero__meta mono">
          <div>
            <dt>STACK</dt>
            <dd>VUE3 / NODE / SQLITE</dd>
          </div>
          <div>
            <dt>THEME</dt>
            <dd>TIANYI_BLUE #66CCFF</dd>
          </div>
          <div>
            <dt>STATUS</dt>
            <dd class="hero__meta-online">M1 / FOUNDATION</dd>
          </div>
        </dl>
      </div>

      <div class="hero__visual">
        <div class="orbital" aria-hidden="true">
          <span class="orbital__ring orbital__ring--one" />
          <span class="orbital__ring orbital__ring--two" />
          <span class="orbital__dot" />
        </div>

        <div class="terminal card">
          <div class="terminal__bar">
            <span class="terminal__lights"><i /><i /><i /></span>
            <span class="mono">esrs@tianyi: ~/blog</span>
            <span class="mono terminal__status">● ONLINE</span>
          </div>
          <div class="terminal__body mono">
            <template v-for="(line, index) in bootLines" :key="line.text">
              <p class="terminal__command" :style="{ animationDelay: `${index * 220}ms` }">
                <span class="terminal__prompt">{{ line.prompt }}</span> {{ line.text }}
              </p>
              <p class="terminal__result" :style="{ animationDelay: `${index * 220 + 110}ms` }">
                {{ line.result }}
              </p>
            </template>
            <p class="terminal__command terminal__command--last">
              <span class="terminal__prompt">$</span> <span class="terminal__cursor" />
            </p>
          </div>
        </div>

        <div class="floating-chip floating-chip--one mono">// NO_COMMENTS</div>
        <div class="floating-chip floating-chip--two mono">♪ 天依蓝</div>
      </div>
    </section>

    <section class="foundation container">
      <div class="foundation__heading">
        <p class="eyebrow">MILESTONE 01</p>
        <h2>先把地基，浇进蓝色里。</h2>
        <p>
          工程骨架、设计令牌与双主题已就位。接下来的文章、友链、后台和播放器，会在这套基底上逐层生长。
        </p>
      </div>
      <div class="foundation__grid">
        <article class="foundation__card card">
          <span class="foundation__index mono">01</span>
          <h3>天依蓝视觉系统</h3>
          <p>#66CCFF 主色、深空背景、六边形与声波意象，加上克制的网格与扫描线。</p>
        </article>
        <article class="foundation__card card">
          <span class="foundation__index mono">02</span>
          <h3>双主题与本地记忆</h3>
          <p>浅色、深色、跟随系统三种模式，首屏前置应用，避免刷新时闪白。</p>
        </article>
        <article class="foundation__card card">
          <span class="foundation__index mono">03</span>
          <h3>克制的动效</h3>
          <p>首次进入加载界面、路由顶部进度条，以及会尊重 reduced-motion 的过渡。</p>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  overflow: hidden;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.06fr) minmax(360px, 0.94fr);
  align-items: center;
  gap: clamp(36px, 7vw, 88px);
  min-height: calc(100vh - var(--header-height) - 90px);
  padding-top: 52px;
  padding-bottom: 72px;
}

.hero__title {
  max-width: 780px;
  margin-top: 17px;
  font-size: clamp(2.45rem, 5.9vw, 4.8rem);
  line-height: 1.04;
  letter-spacing: -0.045em;
}

.hero__lede {
  max-width: 570px;
  margin-top: 23px;
  font-size: clamp(0.95rem, 1.3vw, 1.04rem);
  line-height: 1.9;
  color: var(--text-soft);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 11px;
  margin-top: 29px;
}

.hero__actions .is-disabled {
  cursor: default;
  opacity: 0.8;
}

.hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 26px;
  margin-top: 38px;
}

.hero__meta div {
  display: grid;
  gap: 3px;
}

.hero__meta dt {
  font-size: 0.58rem;
  letter-spacing: 0.18em;
  color: var(--muted);
}

.hero__meta dd {
  margin: 0;
  font-size: 0.68rem;
  letter-spacing: 0.05em;
  color: var(--text-soft);
}

.hero__meta-online {
  color: var(--brand-deep) !important;
}

:root[data-theme='dark'] .hero__meta-online {
  color: var(--brand) !important;
}

.hero__visual {
  position: relative;
  padding: 40px 12px;
}

.terminal {
  position: relative;
  z-index: 2;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--surface-solid);
  box-shadow: var(--shadow-md);
  transform: perspective(1100px) rotateY(-4deg) rotateX(2deg);
  animation: terminal-float 7s ease-in-out infinite;
}

.terminal__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-alt);
  color: var(--muted);
  font-size: 0.62rem;
}

.terminal__lights {
  display: inline-flex;
  gap: 5px;
}

.terminal__lights i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--border-strong);
}

.terminal__lights i:first-child {
  background: #ff8b8b;
}

.terminal__lights i:nth-child(2) {
  background: #ffd37a;
}

.terminal__lights i:nth-child(3) {
  background: #77e0aa;
}

.terminal__status {
  color: #2f9e6e;
  letter-spacing: 0.08em;
}

.terminal__body {
  min-height: 276px;
  padding: 25px 22px;
  background:
    linear-gradient(160deg, rgba(var(--brand-rgb), 0.08), transparent 52%), var(--code-bg);
  color: #d7edf8;
  font-size: 0.71rem;
  line-height: 1.7;
}

.terminal__command,
.terminal__result {
  opacity: 0;
  animation: line-in 380ms var(--ease-out) forwards;
}

.terminal__command {
  margin-top: 14px;
}

.terminal__command:first-child {
  margin-top: 0;
}

.terminal__prompt {
  color: var(--brand);
}

.terminal__result {
  padding-left: 14px;
  color: #8fb4c7;
}

.terminal__command--last {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 20px;
}

.terminal__cursor {
  width: 6px;
  height: 13px;
  background: var(--brand);
  animation: blink 1s step-end infinite;
}

.orbital {
  position: absolute;
  inset: 4% -8% 3% 12%;
  opacity: 0.8;
}

.orbital__ring {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(var(--brand-rgb), 0.24);
  border-radius: 50%;
  transform: rotate(-18deg) scaleY(0.56);
}

.orbital__ring--two {
  inset: 9% -4%;
  opacity: 0.52;
  transform: rotate(24deg) scaleY(0.72);
}

.orbital__dot {
  position: absolute;
  top: 8%;
  right: 8%;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--brand);
  box-shadow: 0 0 24px 7px rgba(var(--brand-rgb), 0.42);
  animation: dot-orbit 9s linear infinite;
}

.floating-chip {
  position: absolute;
  z-index: 3;
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--muted);
  font-size: 0.6rem;
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(14px);
}

.floating-chip--one {
  right: 4%;
  bottom: 6%;
  transform: rotate(4deg);
}

.floating-chip--two {
  top: 3%;
  left: 1%;
  color: var(--brand-deep);
  transform: rotate(-5deg);
}

:root[data-theme='dark'] .floating-chip--two {
  color: var(--brand);
}

.foundation {
  padding-top: 24px;
  padding-bottom: 90px;
}

.foundation__heading {
  display: grid;
  max-width: 660px;
  gap: 13px;
}

.foundation__heading h2 {
  font-size: clamp(1.7rem, 3vw, 2.6rem);
}

.foundation__heading p:last-child {
  color: var(--text-soft);
  line-height: 1.9;
}

.foundation__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 32px;
}

.foundation__card {
  position: relative;
  padding: 26px 24px 24px;
  overflow: hidden;
  transition:
    transform var(--duration-base) var(--ease-out),
    border-color var(--duration-base) ease,
    box-shadow var(--duration-base) ease;
}

.foundation__card:hover {
  border-color: rgba(var(--brand-rgb), 0.4);
  box-shadow: var(--shadow-md);
  transform: translateY(-4px);
}

.foundation__index {
  display: inline-block;
  margin-bottom: 28px;
  color: var(--brand-strong);
  font-size: 0.66rem;
  letter-spacing: 0.12em;
}

.foundation__card h3 {
  margin-bottom: 9px;
  font-size: 1.02rem;
}

.foundation__card p {
  color: var(--muted);
  font-size: 0.84rem;
  line-height: 1.8;
}

@keyframes terminal-float {
  0%,
  100% {
    transform: perspective(1100px) rotateY(-4deg) rotateX(2deg) translateY(0);
  }
  50% {
    transform: perspective(1100px) rotateY(-2deg) rotateX(1deg) translateY(-7px);
  }
}

@keyframes line-in {
  to {
    opacity: 1;
  }
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

@keyframes dot-orbit {
  from {
    transform: translate(0, 0) rotate(0);
  }
  to {
    transform: translate(-210px, 28px) rotate(-360deg);
  }
}

@media (max-width: 960px) {
  .hero {
    grid-template-columns: 1fr;
    min-height: auto;
    padding-top: 64px;
  }

  .hero__visual {
    width: min(100%, 580px);
    margin-inline: auto;
    padding-top: 8px;
  }
}

@media (max-width: 700px) {
  .foundation__grid {
    grid-template-columns: 1fr;
  }

  .hero__meta {
    gap: 18px;
  }

  .terminal {
    transform: none;
    animation: none;
  }

  .orbital {
    display: none;
  }
}
</style>
