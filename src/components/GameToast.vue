<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: Boolean,
  message: String,
  type: { type: String, default: 'success' } // 'success' or 'error'
})
</script>

<template>
  <Transition name="slide-fade">
    <div v-if="show" class="game-toast" :class="type">
      <div class="icon-box">
        <span v-if="type === 'success'">✔</span>
        <span v-else>✕</span>
      </div>
      <div class="content">
        <span class="title">{{ type === 'success' ? 'SYSTEM UPDATE' : 'SYSTEM ERROR' }}</span>
        <span class="message">{{ message }}</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.game-toast {
  position: fixed; top: 20px; right: 20px;
  background: #000; border: 2px solid #fff;
  color: white; padding: 15px 20px;
  display: flex; align-items: center; gap: 15px;
  z-index: 9999;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
  min-width: 300px;
}

.game-toast.error { border-color: #ff3333; }
.game-toast.error .icon-box { background: #ff3333; color: black; }
.game-toast.error .title { color: #ff3333; }

.icon-box {
  width: 30px; height: 30px; background: #fff; color: #000;
  display: flex; align-items: center; justify-content: center;
  font-weight: 900; font-size: 1.2rem;
}

.content { display: flex; flex-direction: column; }
.title { font-size: 0.7rem; font-weight: 900; letter-spacing: 2px; margin-bottom: 2px; }
.message { font-size: 0.9rem; font-family: 'Inter', sans-serif; }

/* Animasi Slide */
.slide-fade-enter-active, .slide-fade-leave-active { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateX(50px); opacity: 0; }
</style>