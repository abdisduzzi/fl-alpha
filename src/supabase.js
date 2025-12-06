import { createClient } from '@supabase/supabase-js'

// Ganti dengan URL dan KEY yang kamu dapat dari langkah 1 tadi
const supabaseUrl = 'https://pwcllleqxnqddhllolvf.supabase.co'
const supabaseKey = 'sb_publishable_WIDsbpbksnebD_WnFoFa5A_JEaHmDMO'

export const supabase = createClient(supabaseUrl, supabaseKey)