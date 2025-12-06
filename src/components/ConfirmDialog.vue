<script setup>
defineProps({
  isOpen: Boolean,
  message: String
})
const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <div v-if="isOpen" class="backdrop">
    <div class="dialog-box">
      <div class="glitch-header">WARNING</div>
      <p>{{ message }}</p>
      <div class="actions">
        <button class="btn-cancel" @click="$emit('cancel')">CANCEL</button>
        <button class="btn-confirm" @click="$emit('confirm')">CONFIRM</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
.dialog-box { background: #000; border: 2px solid #fff; padding: 30px; width: 400px; text-align: center; box-shadow: 0 0 50px rgba(255,255,255,0.1); }
.glitch-header { font-size: 1.5rem; font-weight: 900; letter-spacing: 3px; color: #fff; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px; }
p { color: #ccc; margin-bottom: 30px; font-size: 1rem; }
.actions { display: flex; gap: 20px; justify-content: center; }
button { padding: 12px 30px; font-weight: 900; letter-spacing: 1px; cursor: pointer; text-transform: uppercase; transition: 0.2s; }
.btn-cancel { background: transparent; border: 1px solid #666; color: #888; }
.btn-cancel:hover { border-color: #fff; color: #fff; }
.btn-confirm { background: #fff; border: 1px solid #fff; color: #000; }
.btn-confirm:hover { background: #000; color: #fff; box-shadow: 0 0 15px #fff; }
</style>