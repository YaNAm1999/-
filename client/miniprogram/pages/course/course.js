const app = getApp();

Page({
  data: {
    userInfo: null,
    courses: [],
    loading: false,
    showCreateModal: false,
    showJoinModal: false,
    newCourse: {
      name: '',
      code: '',
      description: '',
      classTime: '',
      location: ''
    },
    joinCode: ''
  },

  onLoad() {
    this.setData({ userInfo: app.globalData.userInfo });
  },

  onShow() {
    if (app.globalData.userInfo) {
      this.loadCourses();
    }
  },

  request(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiBase}${url}`,
        method,
        data,
        header: {
          'Authorization': `Bearer ${app.globalData.token}`
        },
        success: resolve,
        fail: reject
      });
    });
  },

  async loadCourses() {
    this.setData({ loading: true });
    try {
      const res = await this.request('/courses');
      this.setData({ courses: res.data || [] });
    } catch (error) {
      console.error('Load courses error:', error);
      wx.showToast({ title: '加载课程失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  toggleCreateModal() {
    this.setData({ showCreateModal: !this.data.showCreateModal });
  },

  toggleJoinModal() {
    this.setData({ showJoinModal: !this.data.showJoinModal });
  },

  onCourseNameInput(e) {
    this.setData({ 'newCourse.name': e.detail.value });
  },

  onCourseCodeInput(e) {
    this.setData({ 'newCourse.code': e.detail.value });
  },

  onCourseDescInput(e) {
    this.setData({ 'newCourse.description': e.detail.value });
  },

  onCourseTimeInput(e) {
    this.setData({ 'newCourse.classTime': e.detail.value });
  },

  onCourseLocationInput(e) {
    this.setData({ 'newCourse.location': e.detail.value });
  },

  onJoinCodeInput(e) {
    this.setData({ joinCode: e.detail.value });
  },

  async createCourse() {
    const { name, code, description, classTime, location } = this.data.newCourse;

    if (!name || !code) {
      wx.showToast({ title: '请填写课程名称和代码', icon: 'none' });
      return;
    }

    try {
      await this.request('/courses', 'POST', {
        name,
        code,
        description,
        classTime,
        location
      });

      wx.showToast({ title: '创建成功', icon: 'success' });
      this.toggleCreateModal();
      this.setData({
        newCourse: { name: '', code: '', description: '', classTime: '', location: '' }
      });
      this.loadCourses();
    } catch (error) {
      wx.showToast({ title: error.response?.data?.error || '创建失败', icon: 'none' });
    }
  },

  async joinCourse() {
    if (!this.data.joinCode) {
      wx.showToast({ title: '请输入课程代码', icon: 'none' });
      return;
    }

    try {
      const res = await this.request('/courses/join', 'POST', { code: this.data.joinCode });
      wx.showToast({ title: '加入成功', icon: 'success' });
      this.toggleJoinModal();
      this.setData({ joinCode: '' });
      this.loadCourses();
    } catch (error) {
      wx.showToast({ title: error.response?.data?.error || '加入失败', icon: 'none' });
    }
  },

  goToCourseDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/courseDetail/courseDetail?id=${id}`
    });
  },

  onShareAppMessage() {
    return {
      title: '加入我的课程',
      path: '/pages/course/course'
    };
  }
});