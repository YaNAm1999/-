const db = require('./db');

async function initDatabase() {
    if (db.useSupabase) {
        console.log('Using Supabase database');
        await initSupabase();
    } else {
        console.log('Using in-memory database');
    }
}

async function initSupabase() {
    try {
        await db.supabase.from('users').select('id').limit(1);
        await db.supabase.from('courses').select('id').limit(1);
        await db.supabase.from('assignments').select('id').limit(1);
        await db.supabase.from('questions').select('id').limit(1);
        await db.supabase.from('checkins').select('id').limit(1);
        console.log('Supabase tables are ready');
    } catch (error) {
        console.log('Supabase tables may need to be created:', error.message);
    }
}

module.exports = initDatabase;