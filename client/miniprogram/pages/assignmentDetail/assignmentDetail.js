const app = getApp();

Page({
  data: {
    assignmentId: null,
    assignment: null,
    submissions: [],
    mySubmission: null,
    loading: false,
    showSubmitModal: false,
    submitContent: '',
    userInfo: null
  },

  onLoad(options) {
    this.setData({
      assignmentId: options.id,
      userInfo: app.globalData.userInfo
    });
  },

  onShow() {
    this.loadAssignment();
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

  async loadAssignment() {
    this.setData({ loading: true });
    try {
      const res = await this.request(`/assignments/${this.data.assignmentId}`);
      const assignment = res.data;

      this.setData({
        assignment,
        mySubmission: assignment.mySubmission
      });

      if (this.data.userInfo.role === 'teacher') {
        this.loadSubmissions();
      }
    } catch (error) {
      console.error('Load assignment error:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadSubmissions() {
    try {
      const res = await this.request(`/assignments/${this.data.assignmentId}/submissions`);
      this.setData({ submissions: res.data || [] });
    } catch (error) {
      console.error('Load submissions error:', error);
    }
  },

  toggleSubmitModal() {
    this.setData({ showSubmitModal: !this.data.showSubmitModal });
  },

  onContentInput(e) {
    this.setData({ submitContent: e.detail.value });
  },

  async submitAssignment() {
    try {
      await this.request(`/assignments/${this.data.assignmentId}/submit`, 'POST', {
        content: this.data.submitContent
      });

      wx.showToast({ title: '提交成功', icon: 'success' });
      this.toggleSubmitModal();
      this.loadAssignment();
    } catch (error) {
      wx.showToast({ title: error.response?.data?.error || '提交失败', icon: 'none' });
    }
  },

  async gradeSubmission(e) {
    const { submissionId, score, feedback } = e.currentTarget.dataset;

    try {
      await this.request(`/assignments/${this.data.assignmentId}/grade`, 'POST', {
        submissionId,
        score: parseInt(score),
        feedback
      });

      wx.showToast({ title: '评分成功', icon: 'success' });
      this.loadSubmissions();
    } catch (error) {
      wx.showToast({ title: error.response?.data?.error || '评分失败', icon: 'none' });
    }
  },

  onScoreInput(e) {
    const { id } = e.currentTarget.dataset;
    const score = e.detail.value;
    this.setData({ [`score_${id}`]: score });
  },

  onFeedbackInput(e) {
    const { id } = e.currentTarget.dataset;
    const feedback = e.detail.value;
    this.setData({ [`feedback_${id}`]: feedback });
  },

  submitGrade(e) {
    const { id } = e.currentTarget.dataset;
    const score = this.data[`score_${id}`];
    const feedback = this.data[`feedback_${id}`] || '';

    if (!score || score < 0 || score > 100) {
      wx.showToast({ title: '请输入0-100的分数', icon: 'none' });
      return;
    }

    this.gradeSubmission({ currentTarget: { dataset: { submissionId: id, score, feedback } } });
  }
});