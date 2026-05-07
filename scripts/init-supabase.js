require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_API_KEY);

async function initDatabase() {
  console.log('Initializing Supabase database...');
  
  try {
    const { data: users } = await supabase.from('users').select('id').limit(1);
    if (!users || users.length === 0) {
      await supabase.from('users').insert([
        { username: 'teacher', password: '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', role: 'teacher', name: '张老师' },
        { username: 'student', password: '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', role: 'student', name: '李学生' }
      ]);
      console.log('Users inserted');
    } else {
      console.log('Users table already has data');
    }
    
    const { data: courses } = await supabase.from('courses').select('id').limit(1);
    if (!courses || courses.length === 0) {
      await supabase.from('courses').insert([
        { name: '高等数学', teacher_id: 1 },
        { name: '大学英语', teacher_id: 1 },
        { name: '计算机基础', teacher_id: 1 }
      ]);
      console.log('Courses inserted');
    } else {
      console.log('Courses table already has data');
    }
    
    console.log('Database initialization complete!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

initDatabase();