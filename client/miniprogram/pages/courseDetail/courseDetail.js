const app = getApp();

Page({
  data: {
    userInfo: null,
    courseId: null,
    course: null,
    members: [],
    activeTab: 'home',
    assignments: [],
    questions: [],
    checkins: [],
    stats: null,
    loading: false
  },

  onLoad(options) {
    this.setData({
      courseId: options.id,
      userInfo: app.globalData.userInfo
    });
  },

  onShow() {
    this.loadCourseDetail();
    this.loadAssignments();
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

  async loadCourseDetail() {
    try {
      const res = await this.request(`/courses/${this.data.courseId}`);
      this.setData({ course: res.data });
      this.loadMembers();
      this.loadStats();
    } catch (error) {
      console.error('Load course error:', error);
    }
  },

  async loadMembers() {
    try {
      const res = await this.request(`/courses/${this.data.courseId}/members`);
      this.setData({ members: res.data || [] });
    } catch (error) {
      console.error('Load members error:', error);
    }
  },

  async loadStats() {
    try {
      const res = await this.request(`/statistics/${this.data.courseId}`);
      this.setData({ stats: res.data });
    } catch (error) {
      console.error('Load stats error:', error);
    }
  },

  async loadAssignments() {
    try {
      const res = await this.request(`/assignments?courseId=${this.data.courseId}`);
      this.setData({ assignments: res.data || [] });
    } catch (error) {
      console.error('Load assignments error:', error);
    }
  },

  async loadQuestions() {
    try {
      const res = await this.request(`/questions?courseId=${this.data.courseId}`);
      this.setData({ questions: res.data || [] });
    } catch (error) {
      console.error('Load questions error:', error);
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  goToCheckin() {
    wx.navigateTo({
      url: `/pages/checkin/checkin?courseId=${this.data.courseId}`
    });
  },

  goToAssignment(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/assignmentDetail/assignmentDetail?id=${id}`
    });
  },

  goToQuestion(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/question/question?courseId=${this.data.courseId}&questionId=${id}`
    });
  },

  copyCode() {
    if (this.data.course && this.data.course.code) {
      wx.setClipboardData({
        data: this.data.course.code,
        success: () => {
          wx.showToast({ title: '已复制课程代码', icon: 'success' });
        }
      });
    }
  }
});