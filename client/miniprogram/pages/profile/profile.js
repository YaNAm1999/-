const app = getApp();

Page({
  data: {
    userInfo: null,
    stats: {
      courses: 0,
      assignments: 0,
      questions: 0
    }
  },

  onLoad() {
    this.setData({ userInfo: app.globalData.userInfo });
  },

  onShow() {
    this.loadStats();
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

  async loadStats() {
    try {
      const [coursesRes, assignmentsRes] = await Promise.all([
        this.request('/courses'),
        this.request('/assignments')
      ]);

      this.setData({
        stats: {
          courses: coursesRes.data?.length || 0,
          assignments: assignmentsRes.data?.length || 0
        }
      });
    } catch (error) {
      console.error('Load stats error:', error);
    }
  },

  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.globalData.token = null;
          app.globalData.userInfo = null;
          wx.clearStorageSync();
          wx.redirectTo({ url: '/pages/login/login' });
        }
      }
    });
  }
});