<script setup>
import { ref, watch, computed } from 'vue'
import { supabase } from '../supabase'

const props = defineProps({ game: Object, isOpen: Boolean })
const emit = defineEmits(['close', 'saved'])

const loading = ref(false)
const rating = ref(0)
const reviewText = ref('')
const playedDate = ref(new Date().toISOString().substr(0, 10))
const status = ref('completed')
const hoverRating = ref(0)

// Normalisasi Data
const gameData = computed(() => {
  if (!props.game) return {}
  return {
    title: props.game.game_title || props.game.title || 'Unknown Game',
    image: props.game.game_image || props.game.img || '',
    isEdit: !!props.game.id 
  }
})

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    if (gameData.value.isEdit) {
      rating.value = props.game.rating || 0
      reviewText.value = props.game.review || ''
      status.value = props.game.status || 'completed'
      playedDate.value = props.game.created_at ? new Date(props.game.created_at).toISOString().substr(0, 10) : new Date().toISOString().substr(0, 10)
    } else {
      rating.value = 0; reviewText.value = ''; status.value = 'completed'
    }
  }
})

const setRating = (val) => { rating.value = val }

const saveLog = async () => {
  // --- VALIDASI REVIEW (WAJIB ISI) ---
  if (!reviewText.value || reviewText.value.trim() === "") {
    alert("Please write a review before saving! 📝")
    return // Stop proses, jangan lanjut ke database
  }

  loading.value = true
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { alert("Login dulu!"); loading.value = false; return }

  const payload = {
    user_id: user.id,
    game_title: gameData.value.title,
    game_image: gameData.value.image,
    rating: rating.value,
    review: reviewText.value,
    status: status.value,
    created_at: playedDate.value,
    updated_at: new Date()
  }

  // UPSERT (Strict Upsert)
  const { error } = await supabase.from('user_games').upsert(payload, {
    onConflict: 'user_id, game_title'
  })

  if (error) alert("Error: " + error.message)
  else {
    alert("Review saved successfully!")
    emit('saved'); emit('close')
  }
  loading.value = false
}
</script>

<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-content fade-in">
      <div class="modal-header">
        <img :src="gameData.image" class="mini-poster">
        <div class="header-text">
          <span class="label">{{ status === 'plan_to_play' ? 'I WANT TO PLAY...' : 'I PLAYED...' }}</span>
          <h2>{{ gameData.title }}</h2>
          <span class="year">LOG ENTRY</span>
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="form-area">
        <div class="top-row">
          <div class="input-group">
            <label>Date</label>
            <input v-model="playedDate" type="date" class="date-input">
          </div>
          <div class="input-group">
             <label>Status</label>
             <select v-model="status" class="status-select">
               <option value="completed">Completed</option>
               <option value="playing">Playing</option>
               <option value="plan_to_play">Plan to Play</option>
               <option value="dropped">Dropped</option>
             </select>
          </div>
        </div>
        
        <textarea 
          v-model="reviewText" 
          placeholder="Write your review here (Required)..." 
          rows="5"
          class="review-box"
        ></textarea>
        
        <div class="rating-area">
          <span class="rating-label">RATING</span>
          <div class="stars-wrapper" @mouseleave="hoverRating = 0">
            <div v-for="n in 5" :key="n" class="star-container">
              <div class="star-hitbox left" @mouseover="hoverRating = n - 0.5" @click="setRating(n - 0.5)"></div>
              <div class="star-hitbox right" @mouseover="hoverRating = n" @click="setRating(n)"></div>
              <svg viewBox="0 0 24 24" class="star-shape">
                <defs>
                  <linearGradient :id="'half-'+n" x1="0" x2="100%" y1="0" y2="0">
                    <stop offset="50%" stop-color="#ffffff"/><stop offset="50%" stop-color="#333"/>
                  </linearGradient>
                </defs>
                <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z"
                  :fill="(hoverRating || rating) >= n ? '#ffffff' : ((hoverRating || rating) >= n - 0.5 ? 'url(#half-'+n+')' : '#333')"/>
              </svg>
            </div>
            <span class="rating-number">{{ (hoverRating || rating).toFixed(1) }}</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-save" @click="saveLog" :disabled="loading">{{ loading ? 'SAVING...' : 'SAVE' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Style Modal (Sama seperti sebelumnya - Neon White Theme) */
.modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); backdrop-filter: blur(8px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
.modal-content { background: #000; border: 1px solid #333; width: 90%; max-width: 550px; border-radius: 4px; overflow: hidden; box-shadow: 0 0 50px rgba(255,255,255,0.1); }
.modal-header { display: flex; gap: 20px; padding: 25px; border-bottom: 1px solid #222; position: relative; background: #000; }
.mini-poster { width: 70px; height: 105px; object-fit: cover; border-radius: 2px; box-shadow: 0 4px 10px rgba(0,0,0,0.8); border: 1px solid #333; }
.header-text { display: flex; flex-direction: column; justify-content: center; }
.header-text .label { font-size: 0.8rem; color: #fff; letter-spacing: 2px; font-weight: 900; margin-bottom: 5px; text-shadow: 0 0 10px rgba(255,255,255,0.5); }
.header-text h2 { margin: 0; color: white; font-size: 1.8rem; font-weight: 900; letter-spacing: 1px; }
.header-text .year { color: #666; font-size: 0.9rem; margin-top: 5px; font-family: monospace; letter-spacing: 1px; }
.close-btn { position: absolute; top: 20px; right: 20px; background: none; border: none; color: #666; font-size: 1.5rem; cursor: pointer; transition: 0.2s; }
.close-btn:hover { color: white; text-shadow: 0 0 10px white; }
.form-area { padding: 30px; }
.top-row { display: flex; gap: 20px; margin-bottom: 20px; }
.input-group { flex: 1; }
.input-group label { display: block; color: #888; font-size: 0.7rem; margin-bottom: 8px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; }
.date-input, .status-select { width: 100%; background: #111; border: 1px solid #333; color: white; padding: 12px; border-radius: 2px; font-family: 'Inter', sans-serif; transition: 0.2s; }
.status-select:focus, .date-input:focus { border-color: #fff; outline: none; box-shadow: 0 0 10px rgba(255,255,255,0.2); background: #000; }
textarea { width: 100%; background: #111; border: 1px solid #333; border-radius: 2px; color: white; padding: 15px; font-family: 'Inter', sans-serif; font-size: 1rem; resize: none; margin-bottom: 25px; min-height: 120px; transition: 0.2s; }
textarea:focus { border-color: #fff; outline: none; background: #000; box-shadow: 0 0 10px rgba(255,255,255,0.1); }
.rating-area { display: flex; flex-direction: column; gap: 10px; align-items: center; border-top: 1px solid #222; padding-top: 20px; }
.rating-label { color: #666; font-size: 0.8rem; letter-spacing: 3px; font-weight: 900; }
.stars-wrapper { display: flex; align-items: center; gap: 8px; }
.star-container { position: relative; width: 35px; height: 35px; cursor: pointer; }
.star-shape { width: 100%; height: 100%; filter: drop-shadow(0 0 2px rgba(255,255,255,0.3)); }
.star-hitbox { position: absolute; height: 100%; width: 50%; z-index: 10; top: 0; }
.star-hitbox.left { left: 0; }
.star-hitbox.right { right: 0; }
.rating-number { font-size: 1.5rem; font-weight: 900; color: #fff; margin-left: 15px; text-shadow: 0 0 10px rgba(255,255,255,0.5); }
.modal-footer { padding: 20px 30px; background: #000; border-top: 1px solid #222; text-align: right; }
.btn-save { background: #fff; color: #000; font-weight: 900; border: none; padding: 12px 40px; border-radius: 2px; cursor: pointer; letter-spacing: 2px; transition: all 0.2s; }
.btn-save:hover { background: #fff; box-shadow: 0 0 20px rgba(255,255,255,0.6); transform: scale(1.02); }
.btn-save:disabled { background: #333; color: #666; cursor: not-allowed; box-shadow: none; }
.fade-in { animation: popIn 0.3s ease; }
@keyframes popIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
</style>