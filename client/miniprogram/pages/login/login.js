const app = getApp();

Page({
  data: {
    role: 'student',
    name: '',
    studentId: '',
    phone: '',
    loading: false
  },

  onLoad() {
    const userInfo = app.globalData.userInfo;
    if (userInfo) {
      wx.redirectTo({ url: '/pages/index/index' });
    }
  },

  onShareAppMessage() {
    return {
      title: '课堂教学辅助系统',
      path: '/pages/login/login'
    };
  },

  toggleRole(e) {
    this.setData({ role: e.currentTarget.dataset.role });
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },

  onStudentIdInput(e) {
    this.setData({ studentId: e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  async handleLogin() {
    const { name, role, studentId, phone } = this.data;

    if (!name) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }

    if (role === 'student' && !studentId) {
      wx.showToast({ title: '请输入学号', icon: 'none' });
      return;
    }

    if (role === 'teacher' && !phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({
          success: (res) => {
            if (res.code) {
              resolve(res.code);
            } else {
              reject(new Error('获取code失败'));
            }
          },
          fail: reject
        });
      });

      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.apiBase}/auth/login`,
          method: 'POST',
          data: {
            code: loginRes,
            name,
            role,
            studentId: role === 'student' ? studentId : null,
            phone: role === 'teacher' ? phone : null
          },
          success: resolve,
          fail: reject
        });
      });

      if (response.data.token) {
        app.globalData.token = response.data.token;
        app.globalData.userInfo = response.data.user;
        wx.setStorageSync('token', response.data.token);
        wx.setStorageSync('userInfo', response.data.user);

        wx.showToast({ title: '登录成功', icon: 'success' });

        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' });
        }, 1500);
      } else {
        wx.showToast({ title: response.data.error || '登录失败', icon: 'none' });
      }
    } catch (error) {
      console.error('Login error:', error);
      wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});