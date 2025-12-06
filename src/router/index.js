import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import AdminView from '../views/AdminView.vue'
import ProfileView from '../views/ProfileView.vue'
import HomeView from '../views/HomeView.vue'
import { supabase } from '../supabase'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    
    // Admin
    { 
      path: '/admin', 
      component: AdminView, 
      meta: { requiresAuth: true, role: 'admin' } 
    },
    
    // Dashboard / Profile User
    { 
      path: '/dashboard', 
      component: ProfileView, 
      meta: { requiresAuth: true, role: 'user' } 
    }
  ]
})

// Satpam
router.beforeEach(async (to, from, next) => {
  const { data: { session } } = await supabase.auth.getSession()

  if (to.meta.requiresAuth && !session) {
    next('/login')
  } else {
    next()
  }
})

export default router