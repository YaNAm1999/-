
# 课堂教学辅助系统 - 产品需求文档

> **设计原则**：最小程序（Minimal Program）- 仅保留核心功能，避免过度设计

---

## 1. 产品概述

### 1.1 项目背景
基于微信小程序的课堂教学辅助系统，面向毕业设计场景，实现**签到**、**作业**、**问答**三大核心功能。

### 1.2 目标用户
| 角色 | 核心操作 |
|------|----------|
| 教师 | 创建课程、发起签到、发布/批改作业、回答问题 |
| 学生 | 加入课程、参与签到、提交作业、提问 |

---

## 2. 功能模块（最简化）

| 模块 | 功能 | 教师 | 学生 | 说明 |
|------|------|------|------|------|
| 登录 | 微信授权+角色选择 | ✓ | ✓ | P0 |
| 首页 | 数据概览 | ✓ | ✓ | 仅展示统计数字 |
| 课程 | 创建/加入课程 | ✓ | ✓ | 通过课程码加入 |
| 签到 | 发起/参与签到 | ✓ | ✓ | 可选位置校验 |
| 作业 | 发布/提交/批改 | ✓ | ✓ | 文字内容，无需附件 |
| 问答 | 提问/回答 | ✓ | ✓ | 支持匿名提问 |
| 个人中心 | 退出登录 | ✓ | ✓ | 仅保留退出功能 |

---

## 3. 核心功能说明

### 3.1 登录模块
- 输入：姓名、角色（教师/学生）、学号或手机号
- 输出：JWT Token，有效期30天

### 3.2 签到模块
- 教师发起：生成6位随机签到码，设置时长（默认30分钟），可选位置校验
- 学生签到：输入签到码验证，支持位置距离校验
- 校验算法：Haversine距离公式，误差阈值100米

### 3.3 作业模块
- 教师发布：标题+内容，可选截止时间
- 学生提交：文字内容提交，每人每作业仅可提交一次（可覆盖）
- 教师批改：打分（0-100）+文字反馈

### 3.4 问答模块
- 学生提问：选择课程，填写问题，可选匿名
- 教师回答：每个问题仅可回答一次，回答后状态变更为已回答
- 实时推送：通过WebSocket实现新问题/签到实时通知

## 4. 数据库设计（最简）

### 4.1 核心表结构

**users（用户）**
- id, openid, name, student_id, phone, role(teacher/student), avatar

**courses（课程）**
- id, name, code, teacher_id, description, class_time, location

**course_members（课程成员）**
- id, course_id, student_id

**checkins（签到）**
- id, course_id, teacher_id, code(6位), start_time, end_time, status, location_lat/lng/radius

**checkin_records（签到记录）**
- id, checkin_id, student_id, status(present/late/absent), checkin_time

**assignments（作业）**
- id, course_id, teacher_id, title, content, deadline

**assignment_submissions（作业提交）**
- id, assignment_id, student_id, content, score, feedback

**questions（问题）**
- id, course_id, student_id, content, is_anonymous, status(pending/answered)

**answers（回答）**
- id, question_id, teacher_id, content

---

## 5. API 接口（最简）

### 认证
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取用户信息

### 课程
- `GET/POST /api/courses` - 获取/创建课程
- `POST /api/courses/join` - 加入课程

### 签到
- `POST /api/checkins` - 发起签到
- `POST /api/checkins/verify` - 验证签到
- `GET /api/checkins/active` - 获取进行中签到

### 作业
- `GET/POST /api/assignments` - 获取/发布作业
- `POST /api/assignments/:id/submit` - 提交作业
- `POST /api/assignments/:id/grade` - 批改作业

### 问答
- `GET/POST /api/questions` - 获取/提问
- `POST /api/questions/:id/answer` - 回答

---

## 6. 图标资源目录

### 6.1 图标路径清单

所有图标存放于：`miniprogram/assets/icons/`

| 文件名 | 用途 | 颜色 | 尺寸 |
|--------|------|------|------|
| [home.png](file:///d:/畢業設計/BI%20YE%20SHE%20JI/miniprogram/assets/icons/home.png) | 首页Tab默认图标 | #999999 | 1x1px（占位） |
| [home-active.png](file:///d:/畢業設計/BI%20YE%20SHE%20JI/miniprogram/assets/icons/home-active.png) | 首页Tab选中图标 | #4A90E2 | 1x1px（占位） |
| [course.png](file:///d:/畢業設計/BI%20YE%20SHE%20JI/miniprogram/assets/icons/course.png) | 课程Tab默认图标 | #999999 | 1x1px（占位） |
| [course-active.png](file:///d:/畢業設計/BI%20YE%20SHE%20JI/miniprogram/assets/icons/course-active.png) | 课程Tab选中图标 | #4A90E2 | 1x1px（占位） |
| [question.png](file:///d:/畢業設計/BI%20YE%20SHE%20JI/miniprogram/assets/icons/question.png) | 问答Tab默认图标 | #999999 | 1x1px（占位） |
| [question-active.png](file:///d:/畢業設計/BI%20YE%20SHE%20JI/miniprogram/assets/icons/question-active.png) | 问答Tab选中图标 | #4A90E2 | 1x1px（占位） |
| [profile.png](file:///d:/畢業設計/BI%20YE%20SHE%20JI/miniprogram/assets/icons/profile.png) | 个人中心Tab默认图标 | #999999 | 1x1px（占位） |
| [profile-active.png](file:///d:/畢業設計/BI%20YE%20SHE%20JI/miniprogram/assets/icons/profile-active.png) | 个人中心Tab选中图标 | #4A90E2 | 1x1px（占位） |

> **注意**：当前图标为最小占位PNG（1x1像素），实际使用时应替换为81x81像素的正式图标。
