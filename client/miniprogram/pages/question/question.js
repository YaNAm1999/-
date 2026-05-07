const app = getApp();

Page({
  data: {
    userInfo: null,
    questions: [],
    courses: [],
    selectedCourseId: null,
    selectedCourseName: '全部课程',
    newCourseName: '请选择课程',
    loading: false,
    showCreateModal: false,
    showAnswerModal: false,
    newQuestion: {
      courseId: '',
      content: '',
      isAnonymous: false
    },
    currentQuestion: null,
    answerContent: ''
  },

  onLoad(options) {
    this.setData({ userInfo: app.globalData.userInfo });
    this.loadCourses();
    if (options.courseId) {
      this.setData({ selectedCourseId: parseInt(options.courseId) });
    }
  },

  onShow() {
    this.loadQuestions();
  },

  request(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiBase}${url}`,
        method,
        data,
        header: { 'Authorization': `Bearer ${app.globalData.token}` },
        success: resolve,
        fail: reject
      });
    });
  },

  async loadCourses() {
    try {
      const res = await this.request('/courses');
      const courses = res.data || [];
      this.setData({ courses: courses });
      this.updateSelectedCourseName();
    } catch (error) {
      console.error('Load courses error:', error);
    }
  },

  updateSelectedCourseName() {
    const { selectedCourseId, courses } = this.data;
    let courseName = '全部课程';
    if (selectedCourseId) {
      const course = courses.find(c => c.id == selectedCourseId);
      if (course) {
        courseName = course.name;
      }
    }
    this.setData({ selectedCourseName: courseName });
  },

  async loadQuestions() {
    this.setData({ loading: true });
    try {
      const url = this.data.selectedCourseId
        ? `/questions?courseId=${this.data.selectedCourseId}`
        : '/questions';
      const res = await this.request(url);
      const questions = (res.data || []).map(q => {
        const course = this.data.courses.find(c => c.id == q.courseId);
        return { ...q, courseName: course ? course.name : '课程' };
      });
      this.setData({ questions: questions });
    } catch (error) {
      console.error('Load questions error:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  onCourseChange(e) {
    const courseId = e.detail.value;
    this.setData({ selectedCourseId: courseId === 'all' ? null : courseId });
    this.updateSelectedCourseName();
    this.loadQuestions();
  },

  toggleCreateModal() {
    this.setData({ showCreateModal: !this.data.showCreateModal });
  },

  toggleAnswerModal(e) {
    const questionId = e.currentTarget.dataset.id;
    const question = this.data.questions.find(q => q.id === questionId);
    this.setData({
      showAnswerModal: !this.data.showAnswerModal,
      currentQuestion: question
    });
  },

  onQuestionContentInput(e) {
    this.setData({ 'newQuestion.content': e.detail.value });
  },

  onCourseSelect(e) {
    const courseId = e.detail.value;
    this.setData({ 'newQuestion.courseId': courseId });
    const course = this.data.courses.find(c => c.id == courseId);
    this.setData({ newCourseName: course ? course.name : '请选择课程' });
  },

  onAnonymousChange() {
    this.setData({ 'newQuestion.isAnonymous': !this.data.newQuestion.isAnonymous });
  },

  onAnswerInput(e) {
    this.setData({ answerContent: e.detail.value });
  },

  async createQuestion() {
    const { content, courseId, isAnonymous } = this.data.newQuestion;

    if (!content || !courseId) {
      wx.showToast({ title: '请填写问题内容并选择课程', icon: 'none' });
      return;
    }

    try {
      await this.request('/questions', 'POST', {
        courseId,
        content,
        isAnonymous
      });

      wx.showToast({ title: '提问成功', icon: 'success' });
      this.toggleCreateModal();
      this.setData({
        newQuestion: { courseId: '', content: '', isAnonymous: false }
      });
      this.loadQuestions();
    } catch (error) {
      wx.showToast({ title: error.response?.data?.error || '提问失败', icon: 'none' });
    }
  },

  async submitAnswer() {
    if (!this.data.answerContent) {
      wx.showToast({ title: '请输入回答内容', icon: 'none' });
      return;
    }

    try {
      await this.request(`/questions/${this.data.currentQuestion.id}/answer`, 'POST', {
        content: this.data.answerContent
      });

      wx.showToast({ title: '回答成功', icon: 'success' });
      this.toggleAnswerModal();
      this.setData({ answerContent: '' });
      this.loadQuestions();
    } catch (error) {
      wx.showToast({ title: error.response?.data?.error || '回答失败', icon: 'none' });
    }
  }
});