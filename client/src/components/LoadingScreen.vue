<script setup lang="ts">
import BrandMark from '@/components/BrandMark.vue'
</script>

<template>
  <div class="loading-screen" role="status" aria-live="polite">
    <div class="loading-screen__grid" aria-hidden="true" />
    <div class="loading-screen__content">
      <BrandMark :size="68" animated />
      <p class="loading-screen__eyebrow mono">[ INITIALIZING ESRS BLOG ]</p>
      <h1 class="loading-screen__name">饿师傅的技术札记</h1>
      <div class="loading-screen__line">
        <span class="loading-screen__prompt mono">&gt;</span>
        <span class="loading-screen__typing mono">loading fonts, assets &amp; inspiration...</span>
      </div>
      <div class="loading-screen__track" aria-hidden="true">
        <div class="loading-screen__fill" />
      </div>
      <span class="loading-screen__hint mono">FONTS // ASSETS // SYSTEM BOOT</span>
    </div>
  </div>
</template>

<style scoped>
.loading-screen {
  position: fixed;
  inset: 0;
  z-index: 150;
  display: grid;
  place-items: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 40%, rgba(var(--brand-rgb), 0.2), transparent 32rem), var(--bg);
}

.loading-screen__grid {
  position: absolute;
  inset: 0;
  opacity: 0.7;
  background-image:
    linear-gradient(to right, var(--border) 1px, transparent 1px),
    linear-gradient(to bottom, var(--border) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: radial-gradient(circle at center, #000, transparent 70%);
  animation: grid-drift 14s linear infinite;
}

.loading-screen__content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(86vw, 430px);
  text-align: center;
}

.loading-screen__eyebrow {
  margin-top: 24px;
  font-size: 0.68rem;
  letter-spacing: 0.18em;
  color: var(--brand-deep);
}

:root[data-theme='dark'] .loading-screen__eyebrow {
  color: var(--brand);
}

.loading-screen__name {
  margin-top: 10px;
  font-size: clamp(1.5rem, 5vw, 2rem);
  letter-spacing: 0.02em;
}

.loading-screen__line {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 18px;
  font-size: 0.7rem;
  color: var(--muted);
}

.loading-screen__prompt {
  color: var(--brand-deep);
}

.loading-screen__typing {
  overflow: hidden;
  border-right: 1px solid var(--brand-strong);
  white-space: nowrap;
  animation:
    typing 1.9s steps(42, end) infinite,
    caret 800ms step-end infinite;
}

.loading-screen__track {
  width: 100%;
  height: 3px;
  margin-top: 26px;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--border);
}

.loading-screen__fill {
  width: 45%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--brand-strong), var(--brand), var(--accent));
  animation: load-slide 1.15s var(--ease-out) infinite;
}

.loading-screen__hint {
  margin-top: 14px;
  font-size: 0.6rem;
  letter-spacing: 0.16em;
  color: var(--muted);
}

@keyframes typing {
  0% {
    width: 0;
  }
  70%,
  100% {
    width: 100%;
  }
}

@keyframes caret {
  50% {
    border-color: transparent;
  }
}

@keyframes load-slide {
  0% {
    transform: translateX(-105%);
  }
  100% {
    transform: translateX(235%);
  }
}

@keyframes grid-drift {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(54px, 54px, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-screen__typing,
  .loading-screen__fill,
  .loading-screen__grid {
    animation: none;
  }

  .loading-screen__typing {
    width: 100%;
    border: 0;
  }
}
</style>
