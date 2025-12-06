<script setup>
import { ref } from 'vue'

defineProps({
  title: String,
  image: String,
  rating: Number,
  isWishlisted: Boolean,
  isBacklogged: Boolean
})

const emit = defineEmits(['wishlist', 'log', 'backlog'])
const isAnimating = ref(false)

const handleWishlistClick = () => {
  isAnimating.value = true
  emit('wishlist')
  setTimeout(() => isAnimating.value = false, 300)
}
</script>

<template>
  <div class="game-card">
    <div class="poster-wrapper">
      <img :src="image" :alt="title" loading="lazy" />
      
      <button 
        class="btn-mini-backlog" 
        :class="{ 'added': isBacklogged }"
        @click.stop="$emit('backlog')"
        title="Add to Backlog"
      >
        {{ isBacklogged ? 'B' : '+' }}
      </button>

      <div class="overlay">
        <div class="action-buttons">
          <button 
            class="action-btn wishlist-btn" 
            :class="{ 'active': isWishlisted, 'pop-anim': isAnimating }" 
            @click.stop="handleWishlistClick"
          >
            <span class="icon" v-if="isWishlisted">✔</span>
            <span class="icon" v-else>+</span>
            {{ isWishlisted ? 'WISHLISTED' : 'WISHLIST' }}
          </button> 
          
          <button class="action-btn log-btn" @click.stop="$emit('log')">
            <span class="icon">●</span> REVIEW
          </button>
        </div>
      </div>

      <div v-if="rating" class="rating-badge">★ {{ Number(rating).toFixed(1) }}</div>
    </div>
    <h3 class="game-title">{{ title }}</h3>
  </div>
</template>

<style scoped>
.game-card { width: 100%; cursor: pointer; position: relative; perspective: 1000px; }
.poster-wrapper { position: relative; aspect-ratio: 2/3; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.8); transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); border: 1px solid #333; }
img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1); filter: grayscale(20%); }

/* TOMBOL BACKLOG (HITAM PUTIH STYLE) */
.btn-mini-backlog {
  position: absolute; top: 8px; left: 8px; width: 30px; height: 30px;
  background: rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.5); color: white;
  display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold;
  cursor: pointer; z-index: 20; transition: 0.2s; padding-bottom: 2px;
}
.btn-mini-backlog:hover { background: #fff; color: #000; border-color: #fff; }
/* STATE AKTIF BACKLOG */
.btn-mini-backlog.added { background: #fff; border-color: #fff; color: #000; box-shadow: 0 0 10px rgba(255,255,255,0.5); }

.game-card:hover .poster-wrapper { transform: translateY(-8px); box-shadow: 0 15px 40px rgba(255, 255, 255, 0.1); border-color: #fff; }
.game-card:hover img { transform: scale(1.1); filter: grayscale(0%); }
.overlay { position: absolute; top:0; left:0; width:100%; height:100%; background: linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 50%, transparent 100%); display: flex; align-items: flex-end; justify-content: center; padding-bottom: 20px; opacity: 0; transition: opacity 0.3s ease; }
.game-card:hover .overlay { opacity: 1; }
.action-buttons { display: flex; flex-direction: column; gap: 10px; width: 85%; }

/* TOMBOL AKSI UTAMA */
.action-btn {
  border: 1px solid rgba(255,255,255,0.6); outline: none; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px);
  color: white; font-family: 'Inter', sans-serif; font-weight: 800; font-size: 0.75rem; letter-spacing: 2px;
  padding: 12px; border-radius: 2px; text-transform: uppercase; display: flex; align-items: center; justify-content: center; gap: 8px;
  cursor: pointer; transform: translateY(20px); opacity: 0; transition: all 0.3s;
}
.game-card:hover .wishlist-btn { transform: translateY(0); opacity: 1; transition-delay: 0.05s; }
.game-card:hover .log-btn { transform: translateY(0); opacity: 1; transition-delay: 0.1s; }
.action-btn:hover { background: #333; color: white; border-color: #fff; }

/* STATE AKTIF WISHLIST */
.wishlist-btn.active { background: #fff; color: #000; border-color: #fff; box-shadow: 0 0 15px rgba(255,255,255,0.4); }

.pop-anim { animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
@keyframes pop { 0% { transform: scale(1); } 50% { transform: scale(0.9); } 100% { transform: scale(1); } }
.rating-badge { position: absolute; top: 10px; right: 10px; background: #fff; color: #000; padding: 4px 8px; font-size: 0.8rem; border-radius: 2px; font-weight: 900; box-shadow: 0 4px 10px rgba(0,0,0,0.5); z-index: 5; }
.game-title { margin-top: 12px; font-size: 0.9rem; color: #888; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; letter-spacing: 1px; transition: color 0.2s; }
.game-card:hover .game-title { color: white; }
</style>