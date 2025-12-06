<script setup>
import { ref } from 'vue'
import { supabase } from '../supabase'
import { useRouter } from 'vue-router'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)

const handleLogin = async () => {
  console.log("Tombol Login ditekan!"); // Cek di Console browser (F12) kalau penasaran
  loading.value = true
  
  // 1. Auth Login
  const { data: { user }, error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })

  if (error) {
    alert("❌ Error: " + error.message)
    loading.value = false
    return
  }

  // 2. Cek Role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') router.push('/admin') 
  else router.push('/')
  
  loading.value = false
}
</script>

<template>
  <div class="login-wrapper">
    <div class="glow-effect"></div>

    <div class="login-card fade-in-up">
      <h1 class="brand-title">WELCOME BACK</h1>
      <p class="subtitle">Enter your credentials to access the system.</p>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-group">
          <input v-model="email" type="email" required placeholder=" " />
          <label>Email Address</label>
          <div class="underline"></div>
        </div>
        
        <div class="input-group">
          <input v-model="password" type="password" required placeholder=" " />
          <label>Password</label>
          <div class="underline"></div>
        </div>
        
        <button :disabled="loading" type="submit" class="btn-primary">
          {{ loading ? 'PROCESSING...' : 'LOG IN' }}
          <span class="arrow">→</span>
        </button>
      </form>

      <div class="footer">
        <p>New here? <RouterLink to="/register" class="link">Create an Account</RouterLink></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #050505;
  position: relative;
  overflow: hidden;
}

/* KUNCI PERBAIKAN: pointer-events: none agar klik tembus ke bawah */
.glow-effect {
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 0; 
  pointer-events: none; 
}

.login-card {
  background: rgba(20, 20, 20, 0.9); /* Sedikit lebih gelap biar kontras */
  backdrop-filter: blur(20px);
  padding: 50px 40px;
  border-radius: 20px;
  width: 100%;
  max-width: 400px;
  border: 1px solid rgba(255,255,255,0.05);
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  text-align: center;
  position: relative;
  z-index: 10; /* Pastikan Card di atas Glow */
}

.brand-title { font-size: 2rem; font-weight: 800; letter-spacing: 2px; margin-bottom: 10px; color: white; }
.subtitle { color: #666; font-size: 0.9rem; margin-bottom: 40px; }

.input-group { position: relative; margin-bottom: 30px; text-align: left; z-index: 20; }
.input-group input { width: 100%; padding: 10px 0; font-size: 1rem; color: white; background: transparent; border: none; border-bottom: 1px solid #333; outline: none; }
.input-group label { position: absolute; top: 10px; left: 0; color: #666; pointer-events: none; transition: 0.3s ease all; font-size: 1rem; }
.input-group input:focus ~ label, .input-group input:not(:placeholder-shown) ~ label { top: -20px; font-size: 0.8rem; color: white; }
.input-group .underline { position: absolute; bottom: 0; left: 0; height: 2px; width: 0; background: white; transition: 0.4s ease; }
.input-group input:focus ~ .underline { width: 100%; }

/* TOMBOL */
.btn-primary {
  position: relative;
  z-index: 100; /* Layer paling atas */
  width: 100%;
  padding: 15px;
  background: white;
  color: black;
  border: none;
  border-radius: 50px;
  font-weight: 900;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  letter-spacing: 1px;
  transition: transform 0.2s, background-color 0.2s;
}

.btn-primary:hover { transform: scale(1.02); background-color: #f0f0f0; }
.btn-primary:active { transform: scale(0.98); }
.btn-primary:disabled { background: #333; color: #666; cursor: not-allowed; transform: none; }

.footer { margin-top: 30px; font-size: 0.85rem; color: #666; position: relative; z-index: 20; }
.link { color: white; text-decoration: none; font-weight: bold; border-bottom: 1px solid transparent; }
.link:hover { border-bottom: 1px solid white; }

.fade-in-up { animation: fadeInUp 0.8s ease-out; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
</style>