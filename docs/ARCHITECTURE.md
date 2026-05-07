# 课堂教学辅助系统 - 项目架构文档

> **设计原则**：最小程序（Minimal Program）- 精简架构，避免过度设计

---

## 1. 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | 微信小程序原生 | WXML + WXSS + JS |
| 后端 | Node.js + Express | RESTful API + WebSocket |
| 数据库 | MySQL 5.7+ | 关系型数据库 |
| 认证 | JWT (jsonwebtoken) | Token有效期30天 |
| 实时通信 | WebSocket (ws) | 签到/问题推送 |

---

## 2. 项目目录结构

```
classroom-assistant/
├── miniprogram/                    # 微信小程序前端
│   ├── app.js                      # 小程序入口，全局状态管理
│   ├── app.json                    # 小程序配置（页面路由、TabBar）
│   ├── app.wxss                    # 全局样式
│   ├── assets/
│   │   └── icons/                  # TabBar图标资源
│   │       ├── home.png
│   │       ├── home-active.png
│   │       ├── course.png
│   │       ├── course-active.png
│   │       ├── question.png
│   │       ├── question-active.png
│   │       ├── profile.png
│   │       └── profile-active.png
│   └── pages/                      # 页面目录
│       ├── login/                  # 登录页
│       ├── index/                  # 首页
│       ├── course/                 # 课程列表
│       ├── courseDetail/           # 课程详情
│       ├── checkin/                # 签到页
│       ├── assignment/             # 作业列表
│       ├── assignmentDetail/       # 作业详情
│       ├── question/               # 问答页
│       └── profile/                # 个人中心
├── server/
│   ├── index.js                    # 后端服务入口（Express + WebSocket）
│   ├── db.js                       # MySQL 数据库连接池配置
│   ├── dbInit.js                   # 数据库表初始化脚本
│   ├── websocket.js                # WebSocket 实时推送服务
│   ├── middleware/
│   │   ├── auth.js                 # JWT 认证中间件
│   │   └── utils.js                # 工具函数（角色校验、距离计算、签到码生成）
│   └── routes/
│       ├── auth.js                 # 认证相关路由（登录/获取用户信息）
│       ├── courses.js              # 课程相关路由（CRUD/加入/成员管理）
│       ├── checkins.js             # 签到相关路由（创建/验证/记录查询）
│       ├── assignments.js          # 作业相关路由（发布/提交/批改）
│       ├── questions.js            # 问答相关路由（提问/回答）
│       └── statistics.js           # 统计相关路由（课程数据统计）
├── package.json                    # Node.js 依赖配置
├── project.config.json             # 微信开发者工具配置
├── PRD.md                          # 产品需求文档
└── server/.env.example             # 环境变量配置模板
```

---

## 3. 系统架构图

```
┌─────────────────────────────────────────────────┐
│                 微信小程序客户端                  │
│                                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │  登录页  │ │  首页   │ │  课程   │ │  问答   │ │
│  └─────────┘ └─────────┘ └─────────┘ └────────┘ │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │  签到   │ │  作业   │ │ 作业详情 │ │ 个人中心 │ │
│  └─────────┘ └─────────┘ └─────────┘ └────────┘ │
│                                                   │
│  通信层: wx.request (HTTP) + wx.connectSocket (WS)│
└──────────────────────┬────────────────────────────┘
                       │ HTTP + WebSocket
┌──────────────────────┴────────────────────────────┐
│                 后端服务 (Node.js)                  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │            Express HTTP 路由                 │  │
│  │  /api/auth/*  /api/courses/*  /api/checkins/*│  │
│  │  /api/assignments/*  /api/questions/*        │  │
│  └───────────────────┬─────────────────────────┘  │
│                      │                            │
│  ┌───────────────────┴─────────────────────────┐  │
│  │         WebSocket 实时推送服务               │  │
│  │  广播签到 / 广播问题 (按courseId过滤)        │  │
│  └───────────────────┬─────────────────────────┘  │
│                      │                            │
│  ┌───────────────────┴─────────────────────────┐  │
│  │         中间件: JWT认证 + CORS               │  │
│  └───────────────────┬─────────────────────────┘  │
└──────────────────────┬────────────────────────────┘
                       │ mysql2 连接池
┌──────────────────────┴────────────────────────────┐
│                  MySQL 数据库                      │
│                                                   │
│  users │ courses │ course_members │ checkins      │
│  checkin_records │ assignments │ assignment_subm. │
│  questions │ answers                              │
└───────────────────────────────────────────────────┘
```

---

## 4. 前端架构

### 4.1 全局状态 (app.js)

```javascript
App({
  globalData: {
    userInfo: null,      // 用户信息
    token: null,         // JWT Token
    apiBase: 'http://localhost:3000/api',  // API基地址
    wsBase: 'ws://localhost:3000/ws'       // WebSocket基地址
  }
})
```

### 4.2 页面路由配置 (app.json)

| 路由 | 页面 | TabBar |
|------|------|--------|
| `/pages/login/login` | 登录页 | - |
| `/pages/index/index` | 首页 | ✓ 首页 |
| `/pages/course/course` | 课程列表 | ✓ 课程 |
| `/pages/question/question` | 问答页 | ✓ 问答 |
| `/pages/profile/profile` | 个人中心 | ✓ 我的 |
| `/pages/courseDetail/courseDetail` | 课程详情 | - |
| `/pages/checkin/checkin` | 签到页 | - |
| `/pages/assignment/assignment` | 作业列表 | - |
| `/pages/assignmentDetail/assignmentDetail` | 作业详情 | - |

### 4.3 页面文件结构

每个页面遵循微信小程序标准结构：

```
pageName/
├── pageName.js      # 页面逻辑
├── pageName.wxml    # 页面模板
├── pageName.wxss    # 页面样式（可选）
└── pageName.json    # 页面配置（可选）
```

### 4.4 前端请求封装

所有页面统一使用以下请求模式：

```javascript
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
}
```

---

## 5. 后端架构

### 5.1 服务分层（模块化）

```
server/
├── index.js                    # Express + HTTP Server 入口
│   ├── 加载中间件 (CORS, JSON解析)
│   ├── 注册路由 (/api/auth, /api/courses, ...)
│   └── 启动 WebSocket 服务
├── db.js                       # MySQL 连接池
├── dbInit.js                   # 数据库表初始化
├── websocket.js                # WebSocket 服务模块
│   ├── 客户端连接管理 (clients Map)
│   ├── 消息处理 (auth / subscribe / heartbeat)
│   └── 广播函数 (broadcastCheckin / broadcastQuestion)
├── middleware/
│   ├── auth.js                 # JWT 认证中间件
│   │   ├── authenticateToken()   # Token验证
│   │   └── generateToken()       # Token生成
│   └── utils.js                # 工具函数
│       ├── requireRole()         # 角色权限校验
│       ├── calculateDistance()   # Haversine距离计算
│       └── generateCheckinCode() # 签到码生成
└── routes/
    ├── auth.js                 # /api/auth/* (登录/获取用户信息)
    ├── courses.js              # /api/courses/* (课程CRUD/加入)
    ├── checkins.js             # /api/checkins/* (签到创建/验证/记录)
    ├── assignments.js          # /api/assignments/* (作业发布/提交/批改)
    ├── questions.js            # /api/questions/* (提问/回答)
    └── statistics.js           # /api/statistics/* (课程数据统计)
```

### 5.2 API 路由表

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/api/auth/login` | 公开 | 登录/注册 |
| GET | `/api/auth/me` | 已认证 | 获取用户信息 |
| GET | `/api/courses` | 已认证 | 获取课程列表 |
| POST | `/api/courses` | 教师 | 创建课程 |
| GET | `/api/courses/:id` | 已认证 | 获取课程详情 |
| POST | `/api/courses/join` | 已认证 | 加入课程 |
| POST | `/api/checkins` | 教师 | 发起签到 |
| POST | `/api/checkins/verify` | 已认证 | 验证签到 |
| GET | `/api/checkins/active` | 已认证 | 获取进行中签到 |
| GET | `/api/checkins/:id/records` | 教师 | 获取签到记录 |
| GET | `/api/assignments` | 已认证 | 获取作业列表 |
| POST | `/api/assignments` | 教师 | 发布作业 |
| GET | `/api/assignments/:id` | 已认证 | 获取作业详情 |
| POST | `/api/assignments/:id/submit` | 学生 | 提交作业 |
| POST | `/api/assignments/:id/grade` | 教师 | 批改作业 |
| GET | `/api/questions` | 已认证 | 获取问题列表 |
| POST | `/api/questions` | 已认证 | 提问 |
| POST | `/api/questions/:id/answer` | 教师 | 回答问题 |

### 5.3 WebSocket 消息协议

| 消息类型 | 方向 | 说明 |
|----------|------|------|
| `auth` | 客户端→服务器 | JWT认证，携带token |
| `subscribe` | 客户端→服务器 | 订阅课程，携带courseId |
| `heartbeat` | 客户端→服务器 | 心跳保活 |
| `heartbeat_ack` | 服务器→客户端 | 心跳响应 |
| `new_checkin` | 服务器→客户端 | 新签到推送 |
| `new_question` | 服务器→客户端 | 新问题推送 |

---

## 6. 数据库架构

### 6.1 表关系图

```
users (1) ──┬── (N) courses (teacher_id)
            ├── (N) course_members (student_id)
            ├── (N) checkins (teacher_id)
            ├── (N) checkin_records (student_id)
            ├── (N) assignments (teacher_id)
            ├── (N) assignment_submissions (student_id)
            ├── (N) questions (student_id)
            └── (N) answers (teacher_id)

courses (1) ──┬── (N) course_members (course_id)
              ├── (N) checkins (course_id)
              ├── (N) assignments (course_id)
              └── (N) questions (course_id)

checkins (1) ── (N) checkin_records (checkin_id)
assignments (1) ── (N) assignment_submissions (assignment_id)
questions (1) ── (N) answers (question_id)
```

### 6.2 连接池配置

```javascript
mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'classroom_assistant',
  waitForConnections: true,
  connectionLimit: 10
})
```

---

## 7. 安全架构

### 7.1 JWT 认证流程

```
客户端请求 → 携带 Authorization: Bearer <token>
    ↓
authenticateToken 中间件
    ↓
jwt.verify(token, JWT_SECRET)
    ↓
req.user = { id, role }
    ↓
路由处理函数
```

### 7.2 角色权限控制

| 操作 | 教师 | 学生 |
|------|------|------|
| 创建课程 | ✓ | ✗ |
| 发起签到 | ✓ | ✗ |
| 发布作业 | ✓ | ✗ |
| 批改作业 | ✓ | ✗ |
| 回答问题 | ✓ | ✗ |
| 加入课程 | ✗ | ✓ |
| 提交作业 | ✗ | ✓ |
| 提问 | ✗ | ✓ |

### 7.3 签到位置校验

使用 Haversine 公式计算两点间距离：

```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;  // 地球半径(米)
  // ... 计算球面距离
  return R * c;  // 返回距离(米)
}
```

校验逻辑：距离 > location_radius → 签到失败

---

## 8. 部署架构

### 8.1 开发环境

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐
│  微信开发者工具  │────▶│  Node.js (3000) │────▶│  MySQL (3306)│
│  (localhost)    │     │  Express + WS   │     │  (localhost) │
└─────────────────┘     └─────────────────┘     └──────────────┘
```

### 8.2 生产环境（建议）

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐
│  微信小程序线上版 │────▶│  云服务器 Nginx  │────▶│  云数据库    │
│  (HTTPS)        │     │  Node.js/PM2    │     │  MySQL       │
└─────────────────┘     └─────────────────┘     └──────────────┘
```

### 8.3 环境变量配置

后端服务使用 `.env` 文件管理配置，请复制 `server/.env.example` 为 `server/.env` 并修改相应配置：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 服务器端口 | 3000 |
| DB_HOST | 数据库主机 | localhost |
| DB_USER | 数据库用户名 | root |
| DB_PASSWORD | 数据库密码 | root |
| DB_NAME | 数据库名称 | classroom_assistant |
| JWT_SECRET | JWT 签名密钥 | classroom_assistant_secret_key_2024 |

### 8.4 启动命令

| 命令 | 说明 |
|------|------|
| `npm start` | 启动生产服务器 |
| `npm run dev` | 启动开发服务器（nodemon热重载） |

---

## 9. 数据流图

### 9.1 签到流程

```
教师端                         服务器                          学生端
  │                             │                               │
  │── POST /api/checkins ──────▶│                               │
  │     (创建签到)               │                               │
  │◀── { id, code } ────────────│                               │
  │                             │                               │
  │                             │── broadcastCheckin ──────────▶│
  │                             │     (WebSocket推送)            │
  │                             │                               │
  │                             │◀── POST /api/checkins/verify ──│
  │                             │       (验证签到码+位置)         │
  │                             │                               │
  │                             │── { status: 'present' } ──────▶│
```

### 9.2 问答流程

```
学生端                         服务器                          教师端
  │                             │                               │
  │── POST /api/questions ─────▶│                               │
  │     (提问)                   │                               │
  │                             │                               │
  │                             │── broadcastQuestion ─────────▶│
  │                             │     (WebSocket推送)            │
  │                             │                               │
  │                             │◀── POST /api/questions/:id/answer│
  │                             │       (回答)                   │
  │◀── GET /api/questions ──────│                               │
  │     (查看已回答问题)          │                               │
```

---

## 10. 图标资源目录

### 10.1 TabBar 图标

所有图标存放于：`miniprogram/assets/icons/`

| 图标 | 路径 | 用途 | 尺寸 |
|------|------|------|------|
| [home.png](file:///d:/畢業設計/BI%20YE%20SHE%20JI/miniprogram/assets/icons/home.png) | `assets/icons/home.png` | 首页默认 | 1x1px（占位） |
| [home-active.png](file:///d:/畢業設計/BI%20YE%20SHE%20JI/miniprogram/assets/icons/home-active.png) | `assets/icons/home-active.png` | 首页选中 | 1x1px（占位） |
| [course.png](file:///d:/畢業設計/BI%20YE%20SHE%20JI/miniprogram/assets/icons/course.png) | `assets/icons/course.png` | 课程默认 | 1x1px（占位） |
| [course-active.png](file:///d:/畢業設計/BI%20YE%20SHE%20JI/miniprogram/assets/icons/course-active.png) | `assets/icons/course-active.png` | 课程选中 | 1x1px（占位） |
| [question.png](file:///d:/畢業設計/BI%20YE%20SHE%20JI/miniprogram/assets/icons/question.png) | `assets/icons/question.png` | 问答默认 | 1x1px（占位） |
| [question-active.png](file:///d:/畢業設計/BI%20YE%20SHE%20JI/miniprogram/assets/icons/question-active.png) | `assets/icons/question-active.png` | 问答选中 | 1x1px（占位） |
| [profile.png](file:///d:/畢業設計/BI%20YE%20SHE%20JI/miniprogram/assets/icons/profile.png) | `assets/icons/profile.png` | 我的默认 | 1x1px（占位） |
| [profile-active.png](file:///d:/畢業設計/BI%20YE%20SHE%20JI/miniprogram/assets/icons/profile-active.png) | `assets/icons/profile-active.png` | 我的选中 | 1x1px（占位） |

> **注意**：当前为最小占位PNG，实际使用时应替换为81x81像素正式图标。

### 10.2 架构示意图

![系统架构图](architecture-diagram.png)
![数据流图](data-flow-diagram.png)

> **注意**：以上架构示意图为占位图，实际使用时应替换为正式架构图。
