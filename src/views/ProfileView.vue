<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../supabase'
import { useRouter } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import LogModal from '../components/LogModal.vue'
import GameToast from '../components/GameToast.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const router = useRouter()
const user_id = ref('')
const profile = ref({ full_name: 'Gamer', avatar_url: '', bio: '' })
const stats = ref({ played: 0, backlog: 0, wishlist: 0 })

// Data Containers
const favGames = ref([]) 
const backlogGames = ref([]) 
const wishlistGames = ref([]) 
const reviews = ref([]) 
const globalCatalog = ref([]) // Katalog penuh dari Admin

// State UI
const loading = ref(true)
const uploading = ref(false)
const isEditingFav = ref(false)
const showFavPicker = ref(false)
const availableGamesForFav = ref([])

// Modals
const showEditModal = ref(false)
const editForm = ref({ full_name: '', bio: '' })
const showAddModal = ref(false)
const newGameTitle = ref('')
const addMode = ref('backlog') 
const showLogModal = ref(false)
const selectedGameToEdit = ref({})

// Notifikasi
const toast = ref({ show: false, message: '', type: 'success' })
const confirmState = ref({ isOpen: false, message: '', targetId: null, action: null })

const showToast = (msg, type = 'success') => { toast.value = { show: true, message: msg, type }; setTimeout(() => toast.value.show = false, 3000) }
const confirmAction = (msg, id, actionType) => { confirmState.value = { isOpen: true, message: msg, targetId: id, action: actionType } }

onMounted(async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    user_id.value = user.id

    await initProfile(user)
    await fetchGlobalCatalog()
    await fetchAllData()
  } catch (e) { 
    console.error("Critical Init Error:", e); 
    showToast("Critical Init Error. Check console.", 'error')
  } finally { 
    loading.value = false 
  }
})

// --- LOGIKA PROFILE ---
const initProfile = async (user) => {
  let { data } = await supabase.from('profiles').select('*').eq('id', user_id.value).single()
  
  if (!data) {
    const newProfile = { id: user.id, email: user.email, full_name: user.email.split('@')[0], bio: 'New Player', avatar_url: '' }
    const { data: created } = await supabase.from('profiles').upsert(newProfile).select().single()
    profile.value = created || newProfile
  } else {
    profile.value = data
  }
  editForm.value.full_name = profile.value.full_name
  editForm.value.bio = profile.value.bio
}

// --- FETCHERS ---
const fetchGlobalCatalog = async () => {
  try {
    const { data: catalog, error } = await supabase.from('games').select('*')
    if (error) throw error
    
    globalCatalog.value = catalog?.map(g => ({
      title: g.title,
      img: g.image_url,
      game_title: g.title,
      game_image: g.image_url
    })) || []
  } catch (e) {
    console.error("Failed to load catalog for picker:", e);
    showToast("Error loading catalog.", 'error')
  }
}

const fetchAllData = async () => {
  const uid = user_id.value

  // Stats
  const { count: cBacklog } = await supabase.from('user_games').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'backlog')
  const { count: cPlayed } = await supabase.from('user_games').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'completed')
  const { count: cWish } = await supabase.from('user_games').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'wishlist')
  stats.value.backlog = cBacklog || 0; stats.value.played = cPlayed || 0; stats.value.wishlist = cWish || 0;

  // Lists
  const { data: favs } = await supabase.from('user_games').select('*').eq('user_id', uid).eq('is_favorite', true).order('updated_at', { ascending: false }).limit(4)
  favGames.value = favs || []
  const { data: backs } = await supabase.from('user_games').select('*').eq('user_id', uid).eq('status', 'backlog').order('created_at', { ascending: false })
  backlogGames.value = backs || []
  const { data: wishes } = await supabase.from('user_games').select('*').eq('user_id', uid).eq('status', 'wishlist').order('created_at', { ascending: false })
  wishlistGames.value = wishes || []
  const { data: revs } = await supabase.from('user_games').select('*').eq('user_id', uid).neq('review', null).neq('review', '').order('created_at', { ascending: false })
  reviews.value = revs || []
}

// --- LOGIKA ADD DARI KATALOG (FIXED UPSERT) ---
const openAddModal = (mode) => {
  if (globalCatalog.value.length === 0) {
    return showToast("Catalog is empty. Please add games via Admin Panel first!", 'error')
  }
  addMode.value = mode
  showAddModal.value = true
}

const addFromCatalog = async (gameFromCatalog) => {
  let payload = {
    user_id: user_id.value,
    game_title: gameFromCatalog.title, 
    game_image: gameFromCatalog.img,
    updated_at: new Date()
  }

  if (addMode.value === 'favorite') { payload.status = 'completed'; payload.is_favorite = true; }
  else if (addMode.value === 'backlog') { payload.status = 'backlog'; }
  else { payload.status = 'wishlist'; }

  // FIX: UPSERT anti-duplicate key error
  const { error } = await supabase.from('user_games').upsert(payload, { onConflict: 'user_id, game_title' })

  if(error) showToast("Error: " + error.message, 'error')
  else {
    showAddModal.value = false
    await fetchAllData() 
    showToast(`ADDED ${gameFromCatalog.title.toUpperCase()} TO ${addMode.value.toUpperCase()}`)
  }
}

// --- ACTIONS LAIN ---
const executeConfirm = async () => {
  confirmState.value.isOpen = false; const { targetId, action } = confirmState.value;
  if (action === 'deleteGame') {
    const { error } = await supabase.from('user_games').delete().eq('id', targetId); if (!error) { showToast('DELETED'); fetchAllData(); } else showToast(error.message, 'error');
  } else if (action === 'unfavorite') {
    const { error } = await supabase.from('user_games').update({ is_favorite: false }).eq('id', targetId); if (!error) { showToast('REMOVED FAVORITE'); fetchAllData(); }
  }
}

const openFavPicker = async () => {
  const { data } = await supabase.from('user_games').select('*').eq('user_id', user_id.value).eq('is_favorite', false).order('game_title', { ascending: true })
  availableGamesForFav.value = data || []
  showFavPicker.value = true
}
const addToFavorites = async (game) => { await supabase.from('user_games').update({ is_favorite: true, updated_at: new Date() }).eq('id', game.id); showFavPicker.value = false; fetchAllData(); showToast('ADDED FAVORITE') }
const removeFromFavorites = (id) => confirmAction('Remove from Favorites?', id, 'unfavorite')
const deleteGame = (id) => confirmAction('Delete permanently?', id, 'deleteGame')
const openEditReview = (game) => { selectedGameToEdit.value = { ...game, isEdit: true }; showLogModal.value = true }
const uploadAvatar = async (e) => {
  try { uploading.value = true; const file = e.target.files[0]; if (!file) return; const fileExt = file.name.split('.').pop(); const fileName = `${user_id.value}-${Date.now()}.${fileExt}`; await supabase.storage.from('avatars').upload(fileName, file); const { data } = supabase.storage.from('avatars').getPublicUrl(fileName); await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user_id.value); profile.value.avatar_url = data.publicUrl; showToast('AVATAR UPDATED'); } catch (err) { showToast(err.message, 'error') } finally { uploading.value = false }
}
const saveProfile = async () => {
  const { error } = await supabase.from('profiles').update({ full_name: editForm.value.full_name, bio: editForm.value.bio }).eq('id', user_id.value);
  if(!error) { profile.value.full_name = editForm.value.full_name; profile.value.bio = editForm.value.bio; showEditModal.value = false; showToast('PROFILE SAVED') }
}

const visibleBacklog = computed(() => backlogGames.value.length > 9 ? backlogGames.value.slice(0, 8) : backlogGames.value)
const remBacklog = computed(() => backlogGames.value.length - 8)
const visibleWishlist = computed(() => wishlistGames.value.length > 9 ? wishlistGames.value.slice(0, 8) : wishlistGames.value)
const remWishlist = computed(() => wishlistGames.value.length - 8)
</script>

<template>
  <div class="profile-layout">
    <Navbar />
    <GameToast :show="toast.show" :message="toast.message" :type="toast.type" />
    <ConfirmDialog :isOpen="confirmState.isOpen" :message="confirmState.message" @confirm="executeConfirm" @cancel="confirmState.isOpen = false" />

    <div v-if="loading" class="loading-screen">LOADING PROFILE...</div>

    <div v-else>
      <div class="profile-header">
        <div class="container header-grid">
          <div class="avatar-section">
            <div class="avatar-wrapper">
              <img :src="profile.avatar_url || 'https://via.placeholder.com/150/000000/FFFFFF?text=USER'" class="avatar-large" />
              <input type="file" @change="uploadAvatar" accept="image/*" class="file-input">
            </div>
          </div>
          <div class="info-section">
            <div class="names">
              <h1>{{ profile.full_name }}</h1>
              <button class="btn-edit" @click="showEditModal = true">EDIT PROFILE</button>
            </div>
            <p class="bio">{{ profile.bio || 'No bio yet.' }}</p>
            <div class="stats-row">
              <div class="stat"><span class="num">{{ stats.played }}</span><span class="label">COMPLETED</span></div>
              <div class="stat"><span class="num">{{ stats.backlog }}</span><span class="label">BACKLOG</span></div>
              <div class="stat"><span class="num">{{ stats.wishlist }}</span><span class="label">WISHLIST</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="container content-split">
        <div class="left-col">
          <section class="fav-section">
            <div class="section-header-row">
              <div class="section-title">FAVORITE GAMES</div>
              <button class="btn-icon-edit" @click="isEditingFav = !isEditingFav" :class="{ active: isEditingFav }">✎</button>
            </div>
            <div class="fav-grid">
              <div v-for="game in favGames" :key="game.id" class="fav-card has-game">
                <img :src="game.game_image" class="game-cover">
                <div v-if="isEditingFav" class="remove-overlay" @click="confirmAction('Remove from Favorites?', game.id, 'unfavorite')">✕</div>
              </div>
              <div v-for="n in (4 - favGames.length)" :key="n" class="fav-card empty-slot" :class="{ clickable: isEditingFav }" @click="isEditingFav ? openFavPicker() : null">
                <span>{{ isEditingFav ? '+' : '' }}</span>
              </div>
            </div>
          </section>

          <section class="reviews-section">
            <div class="section-title">RECENT REVIEWS</div>
            <div v-if="reviews.length === 0" class="no-reviews">No reviews yet.</div>
            <div v-else class="review-list">
              <div v-for="review in reviews" :key="review.id" class="review-card">
                <div class="review-poster"><img :src="review.game_image"></div>
                <div class="review-content">
                  <div class="review-header">
                    <h4 class="game-name">{{ review.game_title }}</h4>
                    <div class="review-actions">
                      <button class="action-btn edit" @click="openEditReview(review)">✎</button>
                      <button class="action-btn delete" @click="confirmAction('Delete permanently?', review.id, 'deleteGame')">✕</button>
                    </div>
                  </div>
                  <div class="review-meta">
                    <span class="stars">★ {{ Number(review.rating).toFixed(1) }}</span>
                    <span class="date">{{ new Date(review.created_at).toLocaleDateString() }}</span>
                  </div>
                  <p class="review-text">"{{ review.review }}"</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div class="right-col">
          <div class="wishlist-box">
            <div class="wishlist-header">
              <h3>BACKLOG</h3>
              <button class="btn-add-mini" @click="openAddModal('backlog')">+</button>
            </div>
            <div class="wishlist-grid">
              <div v-for="game in visibleBacklog" :key="game.id" class="wish-card-wrapper">
                <div class="wish-card">
                  <img :src="game.game_image">
                  <button class="btn-remove-wish" @click.stop="confirmAction('Remove from Backlog?', game.id, 'deleteGame')">✕</button>
                </div>
              </div>
              <div v-if="backlogGames.length > 9" class="wish-card overflow-card"><span>+{{ remBacklog }}</span></div>
              <div v-if="backlogGames.length === 0" class="empty-wishlist">Empty</div>
            </div>
          </div>

          <div class="wishlist-box" style="margin-top: 40px;">
            <div class="wishlist-header">
              <h3>WISHLIST</h3>
              <button class="btn-add-mini" @click="openAddModal('wishlist')">+</button>
            </div>
            <div class="wishlist-grid">
              <div v-for="game in visibleWishlist" :key="game.id" class="wish-card-wrapper">
                <div class="wish-card">
                  <img :src="game.game_image">
                  <button class="btn-remove-wish" @click.stop="confirmAction('Remove from Wishlist?', game.id, 'deleteGame')">✕</button>
                </div>
              </div>
              <div v-if="wishlistGames.length > 9" class="wish-card overflow-card"><span>+{{ remWishlist }}</span></div>
              <div v-if="wishlistGames.length === 0" class="empty-wishlist">Empty</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showEditModal" class="modal-overlay"><div class="modal-box"><h3>Edit Profile</h3><input v-model="editForm.full_name" type="text" placeholder="Name" class="input-dark"><textarea v-model="editForm.bio" rows="3" placeholder="Bio" class="input-dark"></textarea><div class="modal-actions"><button @click="showEditModal = false" class="btn-cancel">Cancel</button><button @click="saveProfile" class="btn-confirm">Save</button></div></div></div>
    
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-box wide">
        <h3>Add to {{ addMode.toUpperCase() }}</h3>
        <p class="sub-text">Select a game from the catalog:</p>
        
        <div v-if="globalCatalog.length === 0" class="empty-picker">Catalog is empty. Admin needs to add games!</div>
        <div v-else class="picker-grid">
          <div v-for="game in globalCatalog" :key="game.title" class="picker-card" @click="addFromCatalog(game)">
            <img :src="game.img"><span>{{ game.title }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showFavPicker" class="modal-overlay" @click.self="showFavPicker = false"><div class="modal-box wide"><h3>Select Favorite</h3><div v-if="availableGamesForFav.length === 0" class="empty-picker">Log games first!</div><div class="picker-grid"><div v-for="game in availableGamesForFav" :key="game.id" class="picker-card" @click="addToFavorites(game)"><img :src="game.game_image"><span>{{ game.game_title }}</span></div></div></div></div>
    
    <LogModal :isOpen="showLogModal" :game="selectedGameToEdit" @close="showLogModal = false" @saved="fetchAllData(); showToast('LOG SAVED')" />
  </div>
</template>

<style scoped>
/* CSS SAMA SEPERTI SEBELUMNYA */
.profile-layout { background: #050505; min-height: 100vh; color: #fff; font-family: 'Inter', sans-serif; letter-spacing: 0.5px; }
.loading-screen { display: flex; justify-content: center; align-items: center; height: 100vh; font-weight: 900; letter-spacing: 2px; color: white; background: #0a0a0a; }
.container { max-width: 1100px; margin: 0 auto; padding: 40px 20px; }
.profile-header { border-bottom: 1px solid #222; padding: 60px 0; background: #000; }
.header-grid { display: flex; gap: 50px; align-items: flex-start; }
.avatar-wrapper { width: 140px; height: 140px; border-radius: 4px; overflow: hidden; position: relative; border: 1px solid #333; cursor: pointer; }
.avatar-large { width: 100%; height: 100%; object-fit: cover; filter: grayscale(100%); transition: 0.3s; }
.avatar-wrapper:hover .avatar-large { filter: grayscale(0%); }
.file-input { position: absolute; top:0; left:0; width:100%; height:100%; opacity: 0; cursor: pointer; }
.upload-overlay { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold; }
.names h1 { margin: 0; font-size: 2.5rem; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; display: inline-block; margin-right: 20px; }
.btn-edit { background: transparent; color: #666; border: 1px solid #333; padding: 5px 12px; font-size: 0.7rem; font-weight: bold; cursor: pointer; letter-spacing: 1px; transition: 0.2s; }
.btn-edit:hover { border-color: #fff; color: #fff; }
.bio { margin-top: 15px; color: #888; font-size: 1rem; max-width: 600px; line-height: 1.5; border-left: 2px solid #333; padding-left: 15px; }
.stats-row { display: flex; gap: 40px; margin-top: 30px; }
.stat .num { font-weight: 900; font-size: 1.5rem; color: white; display: block; }
.stat .label { font-size: 0.7rem; color: #555; letter-spacing: 2px; font-weight: bold; }
.content-split { display: flex; gap: 60px; margin-top: 50px; }
.left-col { flex: 2; } .right-col { width: 300px; flex-shrink: 0; }
.section-title, .wishlist-header h3 { font-size: 0.8rem; color: #555; border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 20px; letter-spacing: 2px; font-weight: 900; text-transform: uppercase; }
.section-header-row { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #333; padding-bottom: 5px; margin-bottom: 10px; }
.btn-icon-edit { background: transparent; border: none; color: #444; font-size: 1.2rem; cursor: pointer; transition: 0.2s; }
.btn-icon-edit:hover, .btn-icon-edit.active { color: #fff; }
.fav-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
.fav-card { aspect-ratio: 2/3; background: #111; border: 1px solid #222; position: relative; transition: 0.2s; }
.fav-card:hover { border-color: #fff; transform: translateY(-5px); }
.game-cover { width: 100%; height: 100%; object-fit: cover; filter: grayscale(30%); transition: 0.3s; }
.fav-card.has-game:hover .game-cover { filter: grayscale(0%); }
.remove-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; font-size: 2rem; color: red; cursor: pointer; opacity: 0.8; }
.empty-slot { display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #222; border: 1px dashed #222; pointer-events: none; }
.empty-slot.clickable { cursor: pointer; pointer-events: auto; border-color: #555; color: #555; }
.empty-slot.clickable:hover { border-color: #fff; color: #fff; }
.reviews-section { margin-top: 40px; }
.review-list { display: flex; flex-direction: column; gap: 20px; }
.review-card { display: flex; gap: 20px; background: #0a0a0a; padding: 25px; border: 1px solid #222; }
.review-card:hover { border-color: #444; background: #0f0f0f; }
.review-poster img { width: 80px; aspect-ratio: 2/3; object-fit: cover; border: 1px solid #333; }
.review-content { flex: 1; }
.review-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.game-name { margin: 0; font-size: 1.2rem; font-weight: 800; color: white; letter-spacing: 0.5px; }
.stars { color: #fff; font-weight: 900; font-size: 1rem; }
.date { font-size: 0.7rem; color: #444; display: block; margin-top: 2px; text-align: right; }
.review-text { font-family: 'Times New Roman', serif; color: #ccc; font-size: 1.1rem; line-height: 1.6; margin: 10px 0 0; }
.review-actions { display: flex; gap: 10px; }
.action-btn { background: transparent; border: 1px solid #333; color: #555; width: 30px; height: 30px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.action-btn:hover { border-color: #fff; color: #fff; }
.action-btn.delete:hover { border-color: red; color: red; }
.wishlist-header { display: flex; justify-content: space-between; align-items: center; }
.btn-add-mini { background: #111; color: white; border: 1px solid #333; width: 30px; height: 30px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; transition: 0.2s; }
.btn-add-mini:hover { background: #fff; color: #000; }
.wishlist-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.wish-card-wrapper { position: relative; }
.wish-card { aspect-ratio: 2/3; background: #111; border: 1px solid #222; position: relative; overflow: hidden; }
.wish-card:hover { border-color: #fff; }
.wish-card img { width: 100%; height: 100%; object-fit: cover; opacity: 0.7; transition: 0.3s; }
.wish-card:hover img { opacity: 1; }
.btn-remove-wish { position: absolute; top: 0; right: 0; background: #000; color: white; border: none; width: 25px; height: 25px; cursor: pointer; display: none; align-items: center; justify-content: center; z-index: 10; font-size: 0.8rem; }
.wish-card:hover .btn-remove-wish { display: flex; }
.btn-remove-wish:hover { background: red; }
.overflow-card { display: flex; align-items: center; justify-content: center; font-weight: 900; background: #111; color: #444; border: 1px solid #222; }
.empty-wishlist { grid-column: span 3; text-align: center; color: #444; padding: 30px; border: 1px dashed #222; font-size: 0.8rem; letter-spacing: 1px; }
.modal-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.modal-box { background: #000; padding: 40px; width: 400px; border: 1px solid #333; box-shadow: 0 0 50px rgba(0,0,0,0.8); }
.modal-box.wide { width: 600px; }
.modal-box h3 { margin-top: 0; letter-spacing: 2px; font-weight: 900; color: #fff; margin-bottom: 20px; border-bottom: 2px solid #222; padding-bottom: 10px; display: inline-block; }
.sub-text { color: #888; font-size: 0.9rem; margin-bottom: 20px; }
.input-dark { width: 100%; padding: 15px; background: #111; border: 1px solid #333; color: white; margin-bottom: 15px; font-family: 'Inter', sans-serif; }
.input-dark:focus { border-color: #fff; outline: none; background: #000; }
.modal-actions { display: flex; gap: 15px; justify-content: flex-end; margin-top: 20px; }
.btn-cancel { background: transparent; color: #666; border: none; padding: 10px 20px; cursor: pointer; font-weight: bold; letter-spacing: 1px; }
.btn-cancel:hover { color: #fff; }
.btn-confirm { background: #fff; color: #000; border: none; padding: 10px 30px; font-weight: 900; cursor: pointer; letter-spacing: 1px; }
.btn-confirm:hover { background: #ccc; }
.picker-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; max-height: 400px; overflow-y: auto; }
.picker-card { background: #111; border: 1px solid #222; padding: 10px; cursor: pointer; transition: 0.2s; display: flex; flex-direction: column; align-items: center; text-align: center; }
.picker-card:hover { border-color: #fff; background: #1a1a1a; }
.picker-card img { width: 100%; aspect-ratio: 2/3; object-fit: cover; margin-bottom: 10px; }
.picker-card span { font-size: 0.8rem; font-weight: bold; }
.empty-picker { text-align: center; color: #666; font-style: italic; }
@media (max-width: 768px) { .content-split { flex-direction: column; } .header-grid { flex-direction: column; align-items: center; text-align: center; } }
</style>