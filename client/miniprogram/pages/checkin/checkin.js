const app = getApp();

Page({
  data: {
    courseId: null,
    checkinId: null,
    code: '',
    checkinInfo: null,
    status: '',
    loading: false,
    showCreateModal: false,
    createForm: {
      duration: 30,
      enableLocation: false,
      location: null
    }
  },

  onLoad(options) {
    if (options.id && options.code) {
      this.setData({
        checkinId: options.id,
        code: options.code
      });
      this.loadCheckinInfo();
    } else if (options.courseId) {
      this.setData({ courseId: options.courseId });
      this.setData({ showCreateModal: true });
    }
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

  async loadCheckinInfo() {
    try {
      const res = await this.request(`/checkins/${this.data.checkinId}/records`);
      this.setData({
        checkinInfo: res.data,
        records: res.data.records || [],
        absent: res.data.absent || []
      });
    } catch (error) {
      console.error('Load checkin error:', error);
    }
  },

  async createCheckin() {
    const { courseId, createForm } = this.data;

    if (!courseId) {
      wx.showToast({ title: '请先选择课程', icon: 'none' });
      return;
    }

    try {
      const res = await this.request('/checkins', 'POST', {
        courseId,
        duration: createForm.duration,
        location: createForm.enableLocation ? createForm.location : null
      });

      wx.showToast({ title: '签到已发起', icon: 'success' });
      this.setData({
        checkinId: res.data.id,
        code: res.data.code,
        showCreateModal: false
      });
      this.loadCheckinInfo();
    } catch (error) {
      wx.showToast({ title: error.response?.data?.error || '创建失败', icon: 'none' });
    }
  },

  getLocation() {
    wx.showLoading({ title: '获取位置中...' });
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        wx.hideLoading();
        this.setData({
          'createForm.location': { lat: res.latitude, lng: res.longitude },
          'createForm.enableLocation': true
        });
        wx.showToast({ title: '位置已获取', icon: 'success' });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '获取位置失败', icon: 'none' });
      }
    });
  },

  onDurationChange(e) {
    this.setData({ 'createForm.duration': parseInt(e.detail.value) });
  },

  toggleLocation() {
    this.setData({ 'createForm.enableLocation': !this.data.createForm.enableLocation });
  },

  async verifyCheckin() {
    this.setData({ loading: true });

    try {
      let location = null;
      if (this.data.checkinInfo?.location_lat && this.data.checkinInfo?.location_lng) {
        location = await new Promise((resolve) => {
          wx.getLocation({
            type: 'gcj02',
            success: (res) => resolve({ lat: res.latitude, lng: res.longitude }),
            fail: () => resolve(null)
          });
        });
      }

      const res = await this.request('/checkins/verify', 'POST', {
        checkinId: this.data.checkinId,
        location
      });

      this.setData({ status: res.data.status });
      wx.showToast({
        title: res.data.status === 'present' ? '签到成功' : '签到失败',
        icon: res.data.status === 'present' ? 'success' : 'none'
      });
    } catch (error) {
      wx.showToast({ title: error.response?.data?.error || '签到失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  copyCode() {
    if (this.data.code) {
      wx.setClipboardData({
        data: this.data.code,
        success: () => {
          wx.showToast({ title: '已复制签到码', icon: 'success' });
        }
      });
    }
  }
});