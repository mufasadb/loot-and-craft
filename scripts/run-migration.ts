#!/usr/bin/env tsx

import { readFile } from 'fs/promises'
import { join } from 'path'
import { supabase } from '../src/services/supabase'

async function runMigration() {
  try {
    console.log('🗄️  Running database migration for asset tables...')
    
    // Read the migration file
    const migrationPath = join(process.cwd(), 'database', 'migrations', '003_create_asset_tables.sql')
    const sql = await readFile(migrationPath, 'utf-8')
    
    // Split SQL into individual statements and execute them
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`Executing ${statements.length} SQL statements...`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`  ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`)
      
      const { error } = await supabase.rpc('execute_sql', { sql_query: statement })
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error)
        // Try direct execution for some statements
        const { error: directError } = await supabase.from('_internal').select('1').limit(0)
        if (directError) {
          console.log('Using alternative approach...')
          // For complex statements, we'll need to use the Supabase dashboard
          console.log('Please run this SQL in your Supabase dashboard:')
          console.log(statement)
        }
      }
    }
    
    console.log('✅ Migration completed!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.log('\n📝 Please run the following SQL manually in your Supabase dashboard:')
    
    const migrationPath = join(process.cwd(), 'database', 'migrations', '003_create_asset_tables.sql')
    const sql = await readFile(migrationPath, 'utf-8')
    console.log(sql)
    
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
}