const app = getApp();

Page({
  data: {
    userInfo: null,
    activeCheckins: [],
    recentAssignments: [],
    stats: {
      courses: 0,
      checkins: 0,
      assignments: 0
    }
  },

  onLoad() {
    this.setData({ userInfo: app.globalData.userInfo });
  },

  onShow() {
    if (app.globalData.userInfo) {
      this.loadDashboard();
    }
  },

  async loadDashboard() {
    try {
      const [coursesRes, checkinsRes, assignmentsRes] = await Promise.all([
        this.request('/courses'),
        this.request('/checkins/active'),
        this.request('/assignments')
      ]);

      this.setData({
        activeCheckins: checkinsRes.data || [],
        recentAssignments: (assignmentsRes.data || []).slice(0, 5),
        stats: {
          courses: coursesRes.data?.length || 0,
          checkins: checkinsRes.data?.length || 0,
          assignments: assignmentsRes.data?.length || 0
        }
      });
    } catch (error) {
      console.error('Load dashboard error:', error);
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

  goToCheckin(e) {
    const { id, code } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/checkin/checkin?id=${id}&code=${code}`
    });
  },

  goToCourse() {
    wx.switchTab({ url: '/pages/course/course' });
  },

  goToAssignment() {
    wx.switchTab({ url: '/pages/question/question' });
  },

  goToQuestions() {
    wx.switchTab({ url: '/pages/question/question' });
  },

  goToProfile() {
    wx.switchTab({ url: '/pages/profile/profile' });
  }
});