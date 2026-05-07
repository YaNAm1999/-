const app = getApp();

Page({
  data: {
    userInfo: null,
    assignments: [],
    courses: [],
    selectedCourseId: null,
    selectedCourseName: '全部课程',
    newCourseName: '请选择课程',
    loading: false,
    showCreateModal: false,
    newAssignment: {
      courseId: '',
      title: '',
      content: '',
      deadline: ''
    }
  },

  onLoad() {
    this.setData({ userInfo: app.globalData.userInfo });
    this.loadCourses();
  },

  onShow() {
    this.loadAssignments();
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

  async loadAssignments() {
    this.setData({ loading: true });
    try {
      const url = this.data.selectedCourseId
        ? `/assignments?courseId=${this.data.selectedCourseId}`
        : '/assignments';
      const res = await this.request(url);
      this.setData({ assignments: res.data || [] });
    } catch (error) {
      console.error('Load assignments error:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  onCourseChange(e) {
    const courseId = e.detail.value;
    this.setData({ selectedCourseId: courseId === 'all' ? null : courseId });
    this.updateSelectedCourseName();
    this.loadAssignments();
  },

  toggleCreateModal() {
    this.setData({ showCreateModal: !this.data.showCreateModal });
  },

  onTitleInput(e) {
    this.setData({ 'newAssignment.title': e.detail.value });
  },

  onContentInput(e) {
    this.setData({ 'newAssignment.content': e.detail.value });
  },

  onDeadlineChange(e) {
    this.setData({ 'newAssignment.deadline': e.detail.value });
  },

  onCourseSelect(e) {
    const courseId = e.detail.value;
    this.setData({ 'newAssignment.courseId': courseId });
    const course = this.data.courses.find(c => c.id == courseId);
    this.setData({ newCourseName: course ? course.name : '请选择课程' });
  },

  async createAssignment() {
    const { title, content, deadline, courseId } = this.data.newAssignment;

    if (!title || !courseId) {
      wx.showToast({ title: '请填写标题并选择课程', icon: 'none' });
      return;
    }

    try {
      await this.request('/assignments', 'POST', {
        courseId,
        title,
        content,
        deadline: deadline ? new Date(deadline).toISOString() : null
      });

      wx.showToast({ title: '创建成功', icon: 'success' });
      this.toggleCreateModal();
      this.setData({
        newAssignment: { courseId: '', title: '', content: '', deadline: '' }
      });
      this.loadAssignments();
    } catch (error) {
      wx.showToast({ title: error.response?.data?.error || '创建失败', icon: 'none' });
    }
  },

  goToAssignmentDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/assignmentDetail/assignmentDetail?id=${id}`
    });
  }
});