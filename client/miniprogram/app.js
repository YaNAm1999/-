App({
  globalData: {
    userInfo: null,
    token: null,
    apiBase: 'http://localhost:3000/api',
    wsBase: 'ws://localhost:3000/ws'
  },
  onLaunch() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    if (token && userInfo) {
      this.globalData.token = token;
      this.globalData.userInfo = userInfo;
    }
  }
})