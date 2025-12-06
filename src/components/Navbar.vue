<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabase'
import { useRouter } from 'vue-router'

// Import Gambar Logo
import logoImg from '@/assets/fl-logo.png' 

const router = useRouter()
const isLoggedIn = ref(false)
const username = ref('')
const avatar_url = ref('')
const showDropdown = ref(false)
const localSearchQuery = ref('') 

const emit = defineEmits(['search'])

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    isLoggedIn.value = true
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (data) {
      username.value = data.full_name
      avatar_url.value = data.avatar_url
    }
  }
})

const handleSearch = () => {
  emit('search', localSearchQuery.value) 
}

const toggleDropdown = () => { showDropdown.value = !showDropdown.value }

const handleLogout = async () => {
  await supabase.auth.signOut()
  window.location.href = '/login'
}
</script>

<template>
  <nav class="navbar">
    
    <div class="logo-wrapper" @click="router.push('/')">
      <img :src="logoImg" alt="Frontlog" class="brand-logo-big" />
    </div>

    <div class="search-area">
      <input 
        v-model="localSearchQuery" 
        @keyup.enter="handleSearch"
        type="text" 
        placeholder="Search games, news, or @users..." 
      />
      <span class="search-icon" @click="handleSearch">🔍</span>
    </div>

    <div class="menu-area">
      <div v-if="isLoggedIn" class="user-logged" @click="toggleDropdown">
        <div class="user-info">
          <span class="user-name">{{ username }}</span>
        </div>
        <img :src="avatar_url || 'https://via.placeholder.com/40'" class="nav-avatar" />
        
        <div v-if="showDropdown" class="dropdown-menu">
          <div class="dropdown-item" @click="router.push('/dashboard')">Profile</div>
          <div class="dropdown-item logout" @click.stop="handleLogout">Log Out</div>
        </div>
      </div>
      
      <div v-else class="guest-menu">
        <button @click="router.push('/login')" class="btn-login">LOG IN</button>
        <button @click="router.push('/register')" class="btn-signup">CREATE ACCOUNT</button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* NAVBAR TETAP RAMPING */
.navbar { 
  display: flex; justify-content: space-between; align-items: center; 
  padding: 0 40px; 
  background: #000; border-bottom: 1px solid #222; 
  position: sticky; top: 0; z-index: 999; 
  height: 70px; 
}

/* LOGO WRAPPER */
.logo-wrapper {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  width: 100px; 
}

/* LOGO RAKSASA "MELAYANG" (FIXED POSITION) */
.brand-logo-big {
  position: absolute;
  /* GANTI NILAI TOP INI BIAR NAIK KE ATAS */
  top: -19px; 
  left: 0;
  height: 110px; 
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 5px 10px rgba(0,0,0,0.8)); 
  transition: transform 0.2s;
  z-index: 1000;
  cursor: pointer;
}

.brand-logo-big:hover {
  transform: scale(1.05); 
}

/* SEARCH BAR (Digeser dikit biar aman) */
.search-area { 
  position: relative; width: 40%; 
  margin-left: 60px; 
}
.search-area input { 
  width: 100%; background: #111; border: 1px solid #333; 
  padding: 12px 45px 12px 20px; border-radius: 30px; 
  color: white; font-size: 0.95rem; transition: 0.3s; 
}
.search-area input:focus { border-color: #fff; outline: none; background: #000; box-shadow: 0 0 10px rgba(255,255,255,0.1); }
.search-icon { position: absolute; right: 20px; top: 50%; transform: translateY(-50%); color: #666; cursor: pointer; }

/* USER MENU */
.user-logged { position: relative; display: flex; align-items: center; gap: 15px; cursor: pointer; }
.user-info { display: flex; flex-direction: column; align-items: flex-end; margin-right: 5px; }
.user-name { color: white; font-weight: bold; font-size: 0.9rem; }
.nav-avatar { width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid #333; transition: 0.2s; }
.nav-avatar:hover { border-color: #fff; }

.dropdown-menu { position: absolute; top: 60px; right: 0; background: #111; border: 1px solid #333; border-radius: 4px; width: 160px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.8); }
.dropdown-item { padding: 15px; color: #ccc; font-size: 0.9rem; transition: 0.2s; font-weight: bold; }
.dropdown-item:hover { background: #fff; color: #000; }
.dropdown-item.logout { color: #ff3333; border-top: 1px solid #222; }
.dropdown-item.logout:hover { background: #ff3333; color: white; }

.guest-menu { display: flex; gap: 15px; }
.btn-login { background: transparent; color: white; border: 1px solid transparent; font-weight: 800; cursor: pointer; padding: 10px 20px; letter-spacing: 1px; font-size: 0.8rem; }
.btn-login:hover { border-color: #fff; }
.btn-signup { background: white; color: black; padding: 10px 25px; border-radius: 4px; border: none; font-weight: 900; cursor: pointer; letter-spacing: 1px; font-size: 0.8rem; }
.btn-signup:hover { background: #ccc; }

@media (max-width: 768px) { .search-area { display: none; } .brand-logo-big { height: 80px; top: -5px; } }
</style>