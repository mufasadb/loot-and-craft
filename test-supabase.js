// Test Supabase connection
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qukkfbatuchgnyxpkigh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1a2tmYmF0dWNoZ255eHBraWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2Mzc0NDcsImV4cCI6MjA2NTIxMzQ0N30.zCLGN16C5uEGwP3uuumsf7FGTD8Vqg2PGnRylfYdqbI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  console.log('🧪 Testing Supabase connection...')
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('players')
      .select('count', { count: 'exact' })
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
      if (error.message.includes('relation "players" does not exist')) {
        console.log('💡 Run the SQL schema in your Supabase dashboard first!')
      }
    } else {
      console.log('✅ Supabase connected successfully!')
      console.log(`📊 Players table exists with ${data.length} records`)
    }
  } catch (err) {
    console.error('❌ Test failed:', err)
  }
}

testConnection()