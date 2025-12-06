<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../supabase'
import Navbar from '../components/Navbar.vue'
import GameCard from '../components/GameCard.vue'
import LogModal from '../components/LogModal.vue'
import GameToast from '../components/GameToast.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

// DATA STATE
const headlineNews = ref(null)
const regularNews = ref([])
const featuredGames = ref([]) 
const fullGameCatalog = ref([]) // Kunci: Ini katalog penuh untuk Search

// UI State
const isLoading = ref(true) 
const showModal = ref(false)
const selectedGame = ref({})
const userStatusMap = ref({}) 
const toast = ref({ show: false, message: '', type: 'success' })
const confirmState = ref({ isOpen: false, message: '', targetGame: null, action: null })
const searchQuery = ref('') 

// --- HELPER NORMALISASI ---
const normalizeTitle = (title) => title ? title.trim().toLowerCase() : '';

// --- HELPER UI ---
const showToast = (msg, type = 'success') => { toast.value = { show: true, message: msg, type }; setTimeout(() => toast.value.show = false, 3000) }
const confirmAction = (msg, game, actionType) => { confirmState.value = { isOpen: true, message: msg, targetGame: game, action: actionType } }

// --- FETCHING ---
onMounted(async () => {
  await fetchHomeContent()
  await fetchUserStatus()
  isLoading.value = false
})

const fetchHomeContent = async () => {
  try {
    // 1. Ambil Headline
    const { data: head } = await supabase.from('news').select('*').eq('category', 'headline').order('created_at', { ascending: false }).limit(1).single()
    headlineNews.value = head || null

    // 2. Ambil Berita Kecil
    const { data: regs } = await supabase.from('news').select('*').eq('category', 'regular').order('created_at', { ascending: false }).limit(3)
    regularNews.value = regs || []

    // 3. AMBIL SELURUH KATALOG (MASTER LIST FOR SEARCH)
    // Pastikan tags diambil juga
    const { data: catalog, error: catalogError } = await supabase.from('games').select('*, tags')
    
    if (catalogError) {
      console.error("CRITICAL: Failed to fetch full catalog.", catalogError)
      showToast("Catalog load error. Check Admin RLS.", 'error')
      fullGameCatalog.value = []
    } else {
      fullGameCatalog.value = catalog || []
    }

    // 4. Ambil Game Featured
    const { data: feats } = await supabase.from('games').select('*').eq('is_featured', true).order('created_at', { ascending: false })
    
    // MAPPING DATA DB KE STRUKTUR CARD
    featuredGames.value = feats?.map(g => ({
      id: g.id, 
      title: g.title,
      img: g.image_url,
      rating: g.rating || 0,
      platform: g.platform
    })) || []
  } catch(e) {
    console.error("Global Fetch Failed:", e)
    showToast("Global content fetch failed.", 'error')
  }
}

// 1. CEK STATUS USER
const fetchUserStatus = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data } = await supabase.from('user_games').select('game_title, status').eq('user_id', user.id)
  
  if (data) {
    userStatusMap.value = {} 
    data.forEach(item => { userStatusMap.value[normalizeTitle(item.game_title)] = item.status })
  }
}

// 2. LOGIKA SIMPAN
const saveGameStatus = async (game, newStatus) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { showToast("Login First!", 'error'); return }

  const normalizedTitle = normalizeTitle(game.title);
  
  const payload = { user_id: user.id, game_title: normalizedTitle, game_image: game.img, status: newStatus, updated_at: new Date() }
  const { error } = await supabase.from('user_games').upsert(payload, { onConflict: 'user_id, game_title' })

  if (error) { showToast(error.message, 'error') } 
  else { userStatusMap.value[normalizedTitle] = newStatus; showToast(`ADDED TO ${newStatus.toUpperCase()}`) }
}

// --- HANDLER BUTTONS ---
const toggleBacklog = async (game) => {
  if (userStatusMap.value[normalizeTitle(game.title)] === 'backlog') { confirmAction(`Remove "${game.title}" from Backlog?`, game, 'removeGame') } 
  else { await saveGameStatus(game, 'backlog') }
}
const toggleWishlist = async (game) => {
  if (userStatusMap.value[normalizeTitle(game.title)] === 'wishlist') { confirmAction(`Remove "${game.title}" from Wishlist?`, game, 'removeGame') } 
  else { await saveGameStatus(game, 'wishlist') }
}

const executeConfirm = async () => {
  const { targetGame, action } = confirmState.value
  confirmState.value.isOpen = false
  const { data: { user } } = await supabase.auth.getUser()
  const normalizedTitle = normalizeTitle(targetGame.title);

  if (action === 'removeGame') {
    const { error } = await supabase.from('user_games').delete().eq('user_id', user.id).eq('game_title', normalizedTitle)
    if (!error) { delete userStatusMap.value[normalizedTitle]; showToast('REMOVED'); await fetchHomeContent(); } 
  }
}

// LOGIKA SEARCH UTAMA (FIXED: Menambahkan Tags Check & Mapping yang Benar)
const searchResults = computed(() => {
  if (!searchQuery.value) return []
  const query = searchQuery.value.toLowerCase().trim()
  
  // Filter dari FULL CATALOG yang sudah di-load
  return fullGameCatalog.value.filter(game => {
    const normalizedTitle = normalizeTitle(game.title);
    
    // 1. Cek Judul Game (atau Platform)
    const titleMatch = normalizedTitle.includes(query) || normalizeTitle(game.platform || '').includes(query);

    // 2. Cek Tags (Array Game)
    const tagsMatch = game.tags && Array.isArray(game.tags) && game.tags.some(tag => 
        tag.toLowerCase().includes(query)
    );

    return titleMatch || tagsMatch; 
  }).map(g => ({ // Mapping data untuk GameCard
    id: g.id, 
    title: g.title,
    img: g.image_url,
    rating: g.rating || 0,
    platform: g.platform
  })).slice(0, 10)
})

const showResults = computed(() => searchQuery.value && searchResults.value.length > 0)
const openLogModal = (game) => { selectedGame.value = game; showModal.value = true }
</script>

<template>
  <div class="main-layout">
    <Navbar @search="searchQuery = $event" />
    <GameToast :show="toast.show" :message="toast.message" :type="toast.type" />
    <ConfirmDialog :isOpen="confirmState.isOpen" :message="confirmState.message" @confirm="executeConfirm" @cancel="confirmState.isOpen = false" />

    <div v-if="isLoading" class="loading-full-screen"><h2 style="color: white;">LOADING CONTENT...</h2></div>

    <div v-else>
      
      <div v-if="showResults" class="search-results-overlay">
          <div class="container search-container">
            <h2>SEARCH RESULTS ({{ searchResults.length }})</h2>
            <div class="game-grid">
               <GameCard 
                  v-for="game in searchResults" 
                  :key="game.title"
                  :title="game.title"
                  :image="game.img"
                  :rating="Number(game.rating)"
                  :isWishlisted="userStatusMap[normalizeTitle(game.title)] === 'wishlist'" 
                  :isBacklogged="userStatusMap[normalizeTitle(game.title)] === 'backlog'" 
                  @backlog="toggleBacklog(game)" 
                  @wishlist="toggleWishlist(game)" 
                  @log="openLogModal(game)"
               />
            </div>
          </div>
      </div>
      
      <div v-else>
        <header class="hero" v-if="headlineNews">
          <div class="hero-bg" :style="{ backgroundImage: `url('${headlineNews.image_url}')` }"></div>
          <div class="hero-overlay"></div>
          <div class="hero-content">
            <h1 class="hero-title">{{ headlineNews.title }}</h1>
            <p class="hero-subtitle">{{ headlineNews.subtitle }}</p>
            <div class="hero-actions">
              <a href="https://thegameawards.com/" target="_blank" class="btn-neon">
                 VISIT SOURCE <span class="glow"></span>
              </a>
            </div>
          </div>
        </header>

        <div class="container">
          
          <section class="news-grid" v-if="regularNews.length > 0">
            <div v-for="news in regularNews" :key="news.id" class="news-card">
              <img :src="news.image_url">
              <div class="news-info">
                <span class="news-date">LATEST NEWS</span>
                <h4>{{ news.title }}</h4>
              </div>
            </div>
          </section>

          <section class="section">
            <div class="section-header"><h2>FEATURED GAMES</h2></div>
            <div class="game-grid">
              <GameCard 
                v-for="game in featuredGames" 
                :key="game.title"
                :title="game.title"
                :image="game.img"
                :rating="Number(game.rating)"
                :isWishlisted="userStatusMap[normalizeTitle(game.title)] === 'wishlist'" 
                :isBacklogged="userStatusMap[normalizeTitle(game.title)] === 'backlog'" 
                @backlog="toggleBacklog(game)" 
                @wishlist="toggleWishlist(game)" 
                @log="openLogModal(game)"
              />
            </div>
            
            <div v-if="featuredGames.length === 0" class="empty-state">
              No games featured yet. Admin needs to add games in Dashboard.
            </div>
          </section>
        </div>
      </div>
    </div>

    <LogModal :isOpen="showModal" :game="selectedGame" @close="showModal = false" @saved="fetchUserStatus(); showToast('REVIEW SAVED')" />
  </div>
</template>

<style scoped>
/* CSS GAHAR & MODERN (SAMA SEPERTI SEBELUMNYA) */
.main-layout { background: #0a0a0a; min-height: 100vh; color: #e0e0e0; font-family: 'Inter', sans-serif; }
.loading-full-screen { display: flex; justify-content: center; align-items: center; height: 100vh; font-weight: 900; letter-spacing: 2px; color: white; background: #0a0a0a; }
.container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }

/* SEARCH OVERLAY */
.search-results-overlay { position: relative; min-height: 100vh; background: #050505; padding-top: 20px; }
.search-container h2 { border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 30px; }

/* HERO (ZOOM + PARALLAX FEEL) */
.hero { position: relative; height: 600px; display: flex; align-items: flex-end; padding: 60px; overflow: hidden; }
.hero-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; transition: transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94); z-index: 0; }
.hero:hover .hero-bg { transform: scale(1.05); }
.hero-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to top, #0a0a0a 10%, rgba(0,0,0,0.6) 50%, transparent 100%); z-index: 1; pointer-events: none; }

.hero-content { position: relative; z-index: 2; max-width: 700px; text-shadow: 0 5px 20px rgba(0,0,0,0.9); }
.hero-title { font-size: 4rem; margin: 0 0 15px 0; line-height: 1; font-weight: 900; color: white; letter-spacing: -2px; text-transform: uppercase; }
.hero-subtitle { color: #ddd; margin-bottom: 30px; font-size: 1.2rem; line-height: 1.6; font-weight: 400; max-width: 600px; }
.hero-actions { display: flex; gap: 15px; }

/* BUTTON NEON (LINK) */
.btn-neon { 
  position: relative; background: transparent; 
  color: white; text-decoration: none; display: inline-block;
  padding: 15px 40px; font-weight: 900; font-size: 0.9rem; letter-spacing: 2px; 
  border: 2px solid white; cursor: pointer; overflow: hidden; 
  transition: all 0.3s ease; text-transform: uppercase; 
}
.btn-neon:hover { 
  background: white; color: black; 
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.6), 0 0 40px rgba(255, 255, 255, 0.3); 
  border-color: white; transform: translateY(-2px); 
}
.btn-neon:active { transform: translateY(1px); box-shadow: 0 0 10px rgba(255, 255, 255, 0.4); }

/* GRID & CARDS */
.section { margin-bottom: 70px; }
.section-header { margin-bottom: 20px; border-bottom: 1px solid #222; padding-bottom: 10px; }
.section-header h2 { font-size: 0.8rem; letter-spacing: 1px; color: #888; font-weight: normal; margin: 0; text-transform: uppercase; }
.game-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px; }
.news-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 60px; margin-top: -40px; position: relative; z-index: 10; }
.news-card { background: #111; border: 1px solid #333; border-radius: 8px; overflow: hidden; transition: 0.2s; cursor: pointer; }
.news-card:hover { transform: translateY(-5px); border-color: #555; }
.news-card img { width: 100%; height: 150px; object-fit: cover; }
.news-info { padding: 15px; }
.news-date { font-size: 0.6rem; color: #00e054; font-weight: bold; letter-spacing: 1px; }
.news-card h4 { margin: 5px 0 0; font-size: 1rem; color: white; line-height: 1.4; font-weight: bold; }
.empty-state { text-align: center; color: #666; padding: 50px; font-style: italic; }

@media (max-width: 768px) { 
  .news-grid { grid-template-columns: 1fr; } 
  .hero-title { font-size: 2.5rem; }
}
</style>