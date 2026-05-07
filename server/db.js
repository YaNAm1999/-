require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseApiKey = process.env.SUPABASE_API_KEY;

const supabase = createClient(supabaseUrl, supabaseApiKey);

const users = [
  { id: 1, username: 'teacher', password: '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', role: 'teacher', name: '张老师' },
  { id: 2, username: 'student', password: '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjzqAKL9xL5jvMFVdNJHvGCgTq/VEq', role: 'student', name: '李学生' }
];

const courses = [
  { id: 1, name: '高等数学', teacherId: 1 },
  { id: 2, name: '大学英语', teacherId: 1 },
  { id: 3, name: '计算机基础', teacherId: 1 }
];

const assignments = [
  { id: 1, courseId: 1, title: '微积分作业一', content: '完成教材第1-5章习题', deadline: '2024-12-31', teacherId: 1, teacher_name: '张老师', course_name: '高等数学' },
  { id: 2, courseId: 2, title: '英语作文', content: '写一篇关于大学生活的作文', deadline: '2024-12-25', teacherId: 1, teacher_name: '张老师', course_name: '大学英语' }
];

const questions = [
  { id: 1, courseId: 1, studentId: 2, studentName: '李学生', content: '导数的定义是什么？', status: 'answered', answer: { teacherName: '张老师', content: '导数是函数在某一点的变化率...', createdAt: '2024-12-01' } },
  { id: 2, courseId: 2, studentId: 2, studentName: '李学生', content: '如何提高英语口语？', status: 'pending' }
];

const checkins = [
  { id: 1, courseId: 1, studentId: 2, checkinTime: '2024-12-01 08:30:00', status: 'normal' }
];

let nextId = { users: 3, courses: 4, assignments: 3, questions: 3, checkins: 2 };

const useSupabase = supabaseUrl && supabaseUrl !== 'your_supabase_url_here' && 
                    supabaseApiKey && supabaseApiKey !== 'your_supabase_api_key_here';
console.log('Supabase config:', { supabaseUrl: !!supabaseUrl, supabaseApiKey: !!supabaseApiKey, useSupabase });

const db = {
  query: async (sql, params = []) => {
    if (!useSupabase) {
      return queryMemory(sql, params);
    }
    return querySupabase(sql, params);
  },
  end: () => Promise.resolve(),
  supabase,
  useSupabase
};

async function queryMemory(sql, params = []) {
  if (sql.includes('SELECT') && sql.includes('users')) {
    let result = [...users];
    if (params.length > 0) {
      result = result.filter(u => u.username === params[0]);
    }
    return [{ rows: result }];
  }
  if (sql.includes('SELECT') && sql.includes('courses')) {
    return [{ rows: courses }];
  }
  if (sql.includes('SELECT') && sql.includes('assignments')) {
    let result = [...assignments];
    if (params.length > 0) {
      result = result.filter(a => a.courseId == params[0]);
    }
    return [{ rows: result }];
  }
  if (sql.includes('SELECT') && sql.includes('questions')) {
    let result = [...questions];
    if (params.length > 0) {
      result = result.filter(q => q.courseId == params[0]);
    }
    return [{ rows: result }];
  }
  if (sql.includes('SELECT') && sql.includes('checkins')) {
    return [{ rows: checkins }];
  }
  if (sql.includes('INSERT INTO assignments')) {
    const newAssignment = {
      id: nextId.assignments++,
      courseId: params[0],
      title: params[1],
      content: params[2] || '',
      deadline: params[3] || null,
      teacherId: 1,
      teacher_name: '张老师',
      course_name: courses.find(c => c.id == params[0])?.name || '未知课程'
    };
    assignments.push(newAssignment);
    return [{ insertId: newAssignment.id }];
  }
  if (sql.includes('INSERT INTO questions')) {
    const newQuestion = {
      id: nextId.questions++,
      courseId: params[0],
      studentId: params[1],
      studentName: params[2],
      content: params[3],
      isAnonymous: params[4] || false,
      status: 'pending',
      answer: null
    };
    questions.push(newQuestion);
    return [{ insertId: newQuestion.id }];
  }
  if (sql.includes('UPDATE questions') && sql.includes('answer')) {
    const questionId = params[1];
    const question = questions.find(q => q.id == questionId);
    if (question) {
      question.answer = {
        teacherName: '张老师',
        content: params[0],
        createdAt: new Date().toISOString().split('T')[0]
      };
      question.status = 'answered';
    }
    return [{ affectedRows: 1 }];
  }
  if (sql.includes('INSERT INTO checkins')) {
    const newCheckin = {
      id: nextId.checkins++,
      courseId: params[0],
      studentId: params[1],
      checkinTime: params[2],
      status: 'normal'
    };
    checkins.push(newCheckin);
    return [{ insertId: newCheckin.id }];
  }
  return [{ rows: [], insertId: 0 }];
}

async function querySupabase(sql, params = []) {
  try {
    if (sql.includes('SELECT') && sql.includes('users')) {
      let query = supabase.from('users').select('*');
      if (params.length > 0) {
        query = query.eq('username', params[0]);
      }
      const { data, error } = await query;
      if (error) throw error;
      return [{ rows: data || [] }];
    }
    if (sql.includes('SELECT') && sql.includes('courses')) {
      const { data, error } = await supabase.from('courses').select('*');
      if (error) throw error;
      return [{ rows: data || [] }];
    }
    if (sql.includes('SELECT') && sql.includes('assignments')) {
      let query = supabase.from('assignments').select('*');
      if (params.length > 0) {
        query = query.eq('course_id', params[0]);
      }
      const { data, error } = await query;
      if (error) throw error;
      return [{ rows: data || [] }];
    }
    if (sql.includes('SELECT') && sql.includes('questions')) {
      let query = supabase.from('questions').select('*');
      if (params.length > 0) {
        query = query.eq('course_id', params[0]);
      }
      const { data, error } = await query;
      if (error) throw error;
      return [{ rows: data || [] }];
    }
    if (sql.includes('INSERT INTO assignments')) {
      const { data, error } = await supabase.from('assignments').insert({
        course_id: params[0],
        title: params[1],
        content: params[2] || '',
        deadline: params[3] || null,
        teacher_id: 1
      }).select();
      if (error) throw error;
      return [{ insertId: data?.[0]?.id || 0 }];
    }
    if (sql.includes('INSERT INTO questions')) {
      const { data, error } = await supabase.from('questions').insert({
        course_id: params[0],
        student_id: params[1],
        content: params[3],
        is_anonymous: params[4] || false,
        status: 'pending'
      }).select();
      if (error) throw error;
      return [{ insertId: data?.[0]?.id || 0 }];
    }
    if (sql.includes('UPDATE questions') && sql.includes('answer')) {
      const { data, error } = await supabase.from('questions').update({
        status: 'answered'
      }).eq('id', params[1]);
      if (error) throw error;
      await supabase.from('answers').insert({
        question_id: params[1],
        teacher_id: 1,
        content: params[0]
      });
      return [{ affectedRows: 1 }];
    }
    return [{ rows: [], insertId: 0 }];
  } catch (error) {
    console.error('Supabase query error:', error);
    return [{ rows: [], insertId: 0 }];
  }
}

module.exports = db;