<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../supabase'
import { useRouter } from 'vue-router'
import GameToast from '../components/GameToast.vue'

const router = useRouter()
const activeTab = ref('games') 
const toast = ref({ show: false, message: '', type: 'success' })
const user_id = ref(null)

// --- STATE PAGINATION ---
const currentPage = ref(1)
const pageSize = 5
// ------------------------

// Data Lists
const gamesList = ref([])
const newsList = ref([])

// Form Models
const gameForm = ref({ id: null, title: '', image_url: '', release_year: '', platform: 'Multiplatform', is_featured: false, rating: 0, tags: '' })
const newsForm = ref({ title: '', subtitle: '', image_url: '', category: 'regular' })

// STATE EDITING & UPLOAD
const editingGame = ref(null) 
const editCoverFile = ref(null) 
const gameCoverFile = ref(null)
const newsCoverFile = ref(null)

// API SEARCH STATES
const apiSearchTerm = ref('')
const apiResults = ref([])
const searchingApi = ref(false)
const RAWG_API_KEY = 'cbfa3333093e4daaaa70f970a054bb00'; 

// --- PLATFORM OPTIONS ---
const platformOptions = [
    'Multiplatform', 'PC', 'PlayStation 5', 'PlayStation 4', 'PlayStation 3', 'PlayStation 2', 'PlayStation', 
    'Xbox Series X/S', 'Xbox One', 'Xbox 360', 'Xbox', 
    'Nintendo Switch', 'Wii U', 'Wii', 'GameCube', 'N64', 'SNES', 'NES', '3DS', 'DS', 'Game Boy'
]

const showToast = (msg, type = 'success') => {
  toast.value = { show: true, message: msg, type }
  setTimeout(() => toast.value.show = false, 3000)
}

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) user_id.value = user.id
  
  await checkAdmin()
  fetchGames()
  fetchNews()
})

// --- HELPER UNTUK PARSING TAGS ---
const parseTags = (tagString) => {
  if (!tagString) return []
  return tagString.split(',')
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0)
}

// --- CORE LOGIC FUNCTIONS ---
const checkAdmin = async () => { 
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return router.push('/login')

  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') { 
    router.push('/');
    showToast("ACCESS DENIED", 'error')
  }
}

const fetchGames = async () => {
  const { data } = await supabase.from('games').select('*, tags').order('created_at', { ascending: false })
  gamesList.value = data || []
  if(editingGame.value && !gamesList.value.find(g => g.id === editingGame.value.id)) {
    cancelEdit()
  }
}

const fetchNews = async () => {
  const { data } = await supabase.from('news').select('*').order('created_at', { ascending: false })
  newsList.value = data || []
}

// --- PAGINATION LOGIC (COMPUTED) ---
const totalPages = computed(() => {
    return Math.max(1, Math.ceil(gamesList.value.length / pageSize))
})

const paginatedGamesList = computed(() => {
    const start = (currentPage.value - 1) * pageSize
    const end = start + pageSize
    return gamesList.value.slice(start, end)
})

const nextPage = () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++
    }
}

const prevPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--
    }
}

// 1. ADD GAME
const addGame = async () => {
  if(!gameForm.value.title) return showToast("Judul wajib diisi!", 'error')
  
  try {
    const uploadedUrl = await uploadImageAndGetUrl(gameCoverFile, 'covers')
    const finalImageUrl = uploadedUrl || gameForm.value.image_url

    if (!finalImageUrl) return showToast("Harus ada Cover Image!", 'error')

    const tagsArray = parseTags(gameForm.value.tags) 
    const payload = { ...gameForm.value, image_url: finalImageUrl, tags: tagsArray }
    delete payload.id; delete payload.tags

    const { error } = await supabase.from('games').insert(payload)
    if(error) throw new Error(error.message)
    
    showToast('GAME ADDED TO CATALOG')
    gameForm.value = { title: '', image_url: '', release_year: '', platform: 'Multiplatform', is_featured: false, rating: 0, tags: '' }
    gameCoverFile.value = null
    fetchGames()

  } catch (e) {
    showToast("Error: " + e.message, 'error')
  }
}

// 2. OPEN EDIT
const openEditForm = (game) => {
  editingGame.value = { ...game }
  editingGame.value.tags = game.tags ? game.tags.join(', ') : '' 
  editCoverFile.value = null
}

// 3. CANCEL EDIT
const cancelEdit = () => {
  editingGame.value = null
  editCoverFile.value = null
}

// 4. SAVE EDIT
const saveEditGame = async () => {
  if(!editingGame.value.title) return showToast("Judul wajib diisi!", 'error')

  try {
    const uploadedUrl = await uploadImageAndGetUrl(editCoverFile, 'covers')
    let finalImageUrl = editingGame.value.image_url;
    
    if (uploadedUrl) { finalImageUrl = uploadedUrl; } 
    else if (!finalImageUrl) { return showToast("Harus ada Cover Image!", 'error') }

    const tagsArray = parseTags(editingGame.value.tags) 
    
    const payload = { ...editingGame.value, image_url: finalImageUrl, tags: tagsArray }
    
    const itemId = payload.id;
    delete payload.id

    const { error } = await supabase.from('games').update(payload).eq('id', itemId)
    
    if(error) throw new Error(error.message)
    
    showToast('GAME UPDATED')
    cancelEdit()
    fetchGames()

  } catch (e) {
    showToast("Error: " + e.message, 'error')
  }
}


// 5. ADD NEWS
const addNews = async () => {
  if(!newsForm.value.title) return showToast("Judul berita wajib!", 'error')
  try {
    const uploadedUrl = await uploadImageAndGetUrl(newsCoverFile, 'covers')
    const finalImageUrl = uploadedUrl || newsForm.value.image_url
    if (!finalImageUrl) return showToast("Cover Image required!", 'error')

    const payload = { ...newsForm.value, image_url: finalImageUrl }
    const { error } = await supabase.from('news').insert(payload)
    if(error) throw error
    
    showToast('NEWS PUBLISHED')
    newsForm.value = { title: '', subtitle: '', image_url: '', category: 'regular' }
    fetchNews()
  } catch (e) { showToast(e.message, 'error') }
}

const deleteItem = async (table, id) => {
  if(!confirm("Delete item ini selamanya?")) return
  const { error } = await supabase.from(table).delete().eq('id', id)
  if(!error) { showToast('DELETED'); table === 'games' ? fetchGames() : fetchNews() }
}

const toggleFeatured = async (game) => {
  const newValue = !game.is_featured
  await supabase.from('games').update({ is_featured: newValue }).eq('id', game.id)
  showToast(newValue ? 'FEATURED' : 'HIDDEN', 'success')
  fetchGames()
}

// 7. HELPER UPLOAD
const uploadImageAndGetUrl = async (fileRef, bucketName) => {
  if (fileRef.value) {
    const file = fileRef.value
    const fileExt = file.name.split('.').pop()
    const filePath = `${user_id.value}/${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, file)
    if (uploadError) throw new Error('Upload Failed: ' + uploadError.message)
    
    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath)
    fileRef.value = null
    return data.publicUrl
  }
  return null
}

const logout = async () => {
  await supabase.auth.signOut()
  window.location.href = '/login'; 
}

// 9. API SEARCH (RAWG)
const searchRawg = async () => {
    if (!apiSearchTerm.value.trim()) return showToast("Enter game name", 'error')
    searchingApi.value = true; apiResults.value = []
    try {
        const query = encodeURIComponent(apiSearchTerm.value)
        const url = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${query}&platforms=15&ordering=-rating&page_size=20` // PS2 ID
        const response = await fetch(url)
        const data = await response.json()
        apiResults.value = data.results.map(g => ({
            title: g.name, image_url: g.background_image, release_year: g.released?.split('-')[0] || 'N/A',
            platform: g.platforms?.map(p => p.platform.name).join(', ') || 'PS2', rating: g.rating_top || 0
        }))
        if (apiResults.value.length === 0) showToast("No games found", 'error')
    } catch (e) { showToast("API Error", 'error') } finally { searchingApi.value = false }
}

const selectApiGame = (game) => {
    gameForm.value.title = game.title
    gameForm.value.image_url = game.image_url
    gameForm.value.release_year = game.release_year
    gameForm.value.platform = game.platform.split(', ')[0] 
    gameForm.value.rating = game.rating
    gameForm.value.tags = game.title.split(' ').join(', ').toLowerCase() 
    apiResults.value = []; apiSearchTerm.value = ''; activeTab.value = 'games'
    showToast("Data loaded to form!", 'success')
}
</script>

<template>
  <div class="admin-layout">
    <GameToast :show="toast.show" :message="toast.message" :type="toast.type" />

    <aside class="sidebar">
      <div class="logo">COMMAND<span class="dot">.</span>CENTER</div>
      <nav>
        <button :class="{ active: activeTab === 'games' }" @click="activeTab = 'games'">GAME CATALOG</button>
        <button :class="{ active: activeTab === 'api' }" @click="activeTab = 'api'">API SEARCH (PS2)</button> 
        <button :class="{ active: activeTab === 'news' }" @click="activeTab = 'news'">NEWS MANAGER</button>
      </nav>
      </aside>

    <main class="content">
      
      <div class="header-actions">
        <h2 class="page-title">{{ activeTab.toUpperCase().replace('_', ' ') }} DASHBOARD</h2>
        <button class="btn-logout-top" @click="logout">LOG OUT</button>
      </div>

      <div v-if="activeTab === 'games'" class="panel">
        
        <div v-if="editingGame" class="form-box editing-form">
          <h2>EDIT GAME: {{ editingGame.title }}</h2>
          <div class="row">
            <input v-model="editingGame.title" type="text" placeholder="Game Title" class="input-dark">
            <input v-model="editingGame.release_year" type="text" placeholder="Year" class="input-dark short">
          </div>
          
          <div class="image-input-group">
            <input v-model="editingGame.image_url" type="text" placeholder="Paste Image URL..." class="input-dark">
            <div class="or-divider">OR</div>
            <label class="file-label">
              <input type="file" @change="editCoverFile = $event.target.files[0]" accept="image/*">
              {{ editCoverFile ? 'Selected: ' + editCoverFile.name : 'Upload New File' }}
            </label>
          </div>
          
          <div v-if="editingGame.image_url || editCoverFile" class="image-preview-box">
             <img :src="editingGame.image_url" alt="Cover Preview" class="preview-img" @error="editingGame.image_url = ''">
             <div v-if="editCoverFile" class="file-override-note">File Preview: {{ editCoverFile.name }}</div>
          </div>
          
          <input v-model="editingGame.tags" type="text" placeholder="Tags (e.g. RPG, Open World, Survival)" class="input-dark">

          <div class="row">
            <select v-model="editingGame.platform" class="input-dark">
              <option v-for="platform in platformOptions" :key="platform" :value="platform">{{ platform }}</option>
            </select>
            <input v-model="editingGame.rating" type="number" step="0.1" placeholder="Rating (0-5)" class="input-dark short">
          </div>

          <label class="checkbox-row">
            <input type="checkbox" v-model="editingGame.is_featured">
            <span>Featured on Homepage?</span>
          </label>

          <div class="edit-actions">
             <button @click="saveEditGame" class="btn-save">SAVE CHANGES</button>
             <button @click="cancelEdit" class="btn-cancel">CANCEL</button>
          </div>
        </div>

        <div v-else class="form-box">
          <h2>ADD GAME TO DATABASE</h2>
          <div class="row">
            <input v-model="gameForm.title" type="text" placeholder="Game Title" class="input-dark">
            <input v-model="gameForm.release_year" type="text" placeholder="Year" class="input-dark short">
          </div>
          
          <div class="image-input-group">
            <input v-model="gameForm.image_url" type="text" placeholder="Paste Image URL..." class="input-dark">
            <div class="or-divider">OR</div>
            <label class="file-label">
              <input type="file" @change="gameCoverFile = $event.target.files[0]" accept="image/*">
              {{ gameCoverFile ? 'Selected: ' + gameCoverFile.name : 'Upload File' }}
            </label>
          </div>
          
          <div v-if="gameForm.image_url" class="image-preview-box">
             <img :src="gameForm.image_url" alt="Cover Preview" class="preview-img" @error="gameForm.image_url = ''">
          </div>
          
          <input v-model="gameForm.tags" type="text" placeholder="Tags (e.g. RPG, Open World, Survival)" class="input-dark">
          
          <div class="row">
            <select v-model="gameForm.platform" class="input-dark">
              <option v-for="platform in platformOptions" :key="platform" :value="platform">{{ platform }}</option>
            </select>
            <input v-model="gameForm.rating" type="number" step="0.1" placeholder="Rating (0-5)" class="input-dark short">
          </div>

          <label class="checkbox-row">
            <input type="checkbox" v-model="gameForm.is_featured">
            <span>Featured on Homepage?</span>
          </label>

          <button @click="addGame" class="btn-save">ADD TO CATALOG</button>
        </div>

        <h3>CURRENT CATALOG (Page {{ currentPage }} / {{ totalPages }})</h3>
        <div class="table-container">
          <div v-for="game in paginatedGamesList" :key="game.id" class="list-row">
            <img :src="game.image_url" class="thumb">
            <div class="info">
              <h4>{{ game.title }}</h4>
              <span class="meta">{{ game.platform }} • {{ game.release_year }} • Tags: {{ game.tags ? game.tags.join(', ') : 'None' }}</span>
            </div>
            <div class="actions">
              <button class="btn-edit" @click="openEditForm(game)">EDIT</button> 
              <button 
                class="btn-toggle" 
                :class="{ active: game.is_featured }"
                @click="toggleFeatured(game)"
              >
                {{ game.is_featured ? '★ ON HOME' : '☆ HIDDEN' }}
              </button>
              <button class="btn-del" @click="deleteItem('games', game.id)">✕</button>
            </div>
          </div>
        </div>

        <div class="pagination-controls">
            <button @click="prevPage" :disabled="currentPage === 1" class="btn-page">← Previous</button>
            <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
            <button @click="nextPage" :disabled="currentPage === totalPages" class="btn-page">Next →</button>
        </div>
      </div>

      <div v-if="activeTab === 'api'" class="panel">
        <h2>SEARCH RAWG FOR PS2 GAMES</h2>
        <p class="meta" style="margin-bottom: 20px;">Platform filter set to PlayStation 2. Max 20 results.</p>
        
        <div class="form-box">
            <input 
              v-model="apiSearchTerm" 
              type="text" 
              placeholder="Search Game Name..." 
              class="input-dark"
              @keyup.enter="searchRawg"
              :disabled="searchingApi"
            >
            <button @click="searchRawg" class="btn-save" :disabled="searchingApi">
              {{ searchingApi ? 'SEARCHING...' : 'SEARCH API' }}
            </button>
        </div>

        <h3 v-if="apiResults.length > 0">API RESULTS (Select to pre-fill form)</h3>
        <div class="table-container list-grid">
            <div v-for="game in apiResults" :key="game.title" class="api-item" @click="selectApiGame(game)">
                <img :src="game.image_url" class="thumb">
                <div class="info">
                    <h4>{{ game.title }}</h4>
                    <span class="meta">{{ game.release_year }} • {{ game.platform }}</span>
                    <span class="badge" style="background:#555;">Rating: {{ game.rating }}</span>
                </div>
                <button class="btn-select">SELECT</button>
            </div>
        </div>
      </div>

      <div v-if="activeTab === 'news'" class="panel">
        <h2>PUBLISH NEWS</h2>
        <div class="form-box">
          <div class="row">
            <select v-model="newsForm.category" class="input-dark">
              <option value="regular">Regular News (Small Box)</option>
              <option value="headline">HEADLINE (Big Banner)</option>
            </select>
          </div>
          <input v-model="newsForm.title" type="text" placeholder="Headline Title" class="input-dark">
          <input v-model="newsForm.subtitle" type="text" placeholder="Short Description" class="input-dark">
          
          <div class="image-input-group">
            <input v-model="newsForm.image_url" type="text" placeholder="Paste Hero Image URL..." class="input-dark">
            <div class="or-divider">OR</div>
            <label class="file-label">
              <input type="file" @change="newsCoverFile = $event.target.files[0]" accept="image/*">
              {{ newsCoverFile ? 'Selected: ' + newsCoverFile.name : 'Upload File' }}
            </label>
          </div>

          <div v-if="newsForm.image_url" class="image-preview-box">
             <img :src="newsForm.image_url" alt="Hero Preview" class="preview-img" @error="newsForm.image_url = ''">
          </div>

          <button @click="addNews" class="btn-save">PUBLISH</button>
        </div>

        <h3>LIVE NEWS FEED</h3>
        <div class="table-container">
          <div v-for="news in newsList" :key="news.id" class="list-row">
            <img :src="news.image_url" class="thumb">
            <div class="info">
              <span class="badge" :class="news.category">{{ news.category }}</span>
              <h4>{{ news.title }}</h4>
            </div>
            <div class="actions">
              <button class="btn-del" @click="deleteItem('news', news.id)">✕</button>
            </div>
          </div>
        </div>
      </div>

    </main>
  </div>
</template>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; background: #000; color: #fff; font-family: 'Inter', sans-serif; }
.sidebar { width: 260px; background: #0a0a0a; border-right: 1px solid #222; padding: 40px 30px; display: flex; flex-direction: column; z-index: 100; }
.logo { font-size: 1.5rem; font-weight: 900; letter-spacing: 2px; margin-bottom: 50px; color: #fff; }
.dot { color: #00e054; }
.sidebar nav { display: flex; flex-direction: column; gap: 15px; flex: 1; }
.sidebar button { background: transparent; border: 1px solid transparent; color: #666; padding: 15px; text-align: left; cursor: pointer; font-weight: bold; letter-spacing: 1px; transition: 0.2s; border-radius: 4px; }
.sidebar button:hover { color: #fff; background: #111; }
.sidebar button.active { background: #fff; color: #000; }

/* CONTENT & HEADER */
.content { flex: 1; padding: 50px; overflow-y: auto; position: relative; }
.header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #222; padding-bottom: 15px; }
.page-title { font-size: 1.5rem; font-weight: 900; color: #fff; margin: 0; }
.btn-logout-top { background: transparent; border: 1px solid #ff3333; color: #ff3333; padding: 8px 15px; font-weight: bold; cursor: pointer; letter-spacing: 1px; transition: 0.2s; }
.btn-logout-top:hover { background: #ff3333; color: white; }

/* FORM STYLES */
.form-box { background: #0a0a0a; padding: 30px; border: 1px solid #222; border-radius: 8px; max-width: 600px; display: flex; flex-direction: column; gap: 15px; }
.form-box.editing-form { border-color: #00e054; margin-bottom: 30px; }
.row { display: flex; gap: 15px; }
.input-dark { background: #000; border: 1px solid #333; color: white; padding: 12px; font-family: inherit; width: 100%; border-radius: 4px; }
.input-dark:focus { border-color: #fff; outline: none; }
.short { width: 120px; flex-shrink: 0; }

.image-input-group { display: flex; align-items: center; gap: 10px; }
.image-input-group input[type="text"] { flex: 1; }
.or-divider { color: #666; font-size: 0.8rem; flex-shrink: 0; }
.file-label { flex-shrink: 0; background: #333; color: white; padding: 12px 15px; border-radius: 4px; cursor: pointer; font-size: 0.9rem; font-weight: bold; }
.file-label input { display: none; }
.image-preview-box { margin-top: 5px; border: 1px solid #333; padding: 5px; border-radius: 4px; max-width: 250px; align-self: center; }
.preview-img { width: 100%; height: auto; display: block; border-radius: 2px; }
.checkbox-row { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; }
.checkbox-row input { width: 20px; height: 20px; accent-color: #00e054; }

.btn-save { background: #00e054; color: #000; font-weight: 900; border: none; padding: 15px; cursor: pointer; letter-spacing: 1px; margin-top: 10px; border-radius: 4px; transition: 0.2s; }
.btn-save:hover { background: #00ff60; transform: translateY(-2px); }

/* EDIT ACTION BUTTONS */
.edit-actions { display: flex; gap: 10px; margin-top: 10px; }
.btn-cancel { background: #333; color: white; font-weight: 900; border: none; padding: 15px; cursor: pointer; letter-spacing: 1px; flex: 1; border-radius: 4px; transition: 0.2s; }
.btn-cancel:hover { background: #555; }

/* LIST & PAGINATION */
.list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.pagination-controls { display: flex; justify-content: center; align-items: center; gap: 20px; margin-top: 30px; }
.btn-page { background: #111; color: white; border: 1px solid #333; padding: 10px 20px; cursor: pointer; transition: 0.2s; }
.btn-page:hover:not(:disabled) { background: #333; border-color: #fff; }
.btn-page:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { color: #888; font-size: 0.9rem; }

.table-container { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
.list-row { display: flex; align-items: center; gap: 20px; background: #0a0a0a; padding: 15px; border: 1px solid #222; border-radius: 6px; transition: 0.2s; }
.list-row:hover { border-color: #444; }
.thumb { width: 50px; height: 70px; object-fit: cover; border-radius: 4px; }
.info { flex: 1; }
.info h4 { margin: 0 0 5px 0; font-size: 1rem; color: #eee; }
.meta { font-size: 0.8rem; color: #666; }

.badge { font-size: 0.6rem; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; font-weight: bold; margin-right: 8px; display: inline-block; margin-bottom: 5px; }
.badge.headline { background: #fff; color: #000; }
.badge.regular { background: #333; color: #aaa; }

.actions { display: flex; gap: 10px; align-items: center; }
.btn-edit { background: #111; border: 1px solid #333; color: #fff; padding: 5px 10px; font-size: 0.7rem; cursor: pointer; border-radius: 4px; font-weight: bold; }
.btn-toggle { background: #111; border: 1px solid #333; color: #666; padding: 5px 10px; font-size: 0.7rem; cursor: pointer; border-radius: 4px; font-weight: bold; }
.btn-toggle.active { border-color: #00e054; color: #00e054; }
.btn-del { background: transparent; border: 1px solid #333; color: #666; width: 30px; height: 30px; cursor: pointer; border-radius: 4px; }
.btn-del:hover { border-color: red; color: red; }

/* API GRID */
.list-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
.api-item { cursor: pointer; background: #0a0a0a; padding: 15px; border: 1px solid #333; border-radius: 6px; display: flex; gap: 15px; align-items: center; transition: 0.2s; }
.api-item:hover { border-color: #fff; background: #111; }
.btn-select { background: #00e054; color: black; padding: 5px 10px; border-radius: 4px; font-weight: bold; font-size: 0.8rem; border: none; cursor: pointer; }
</style>