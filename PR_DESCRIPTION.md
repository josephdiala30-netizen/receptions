# IT Services System Enhancements: Maintenance Migration, Login Fixes, UI Improvements

## 背景
- 现有 IT 运维系统缺少维护记录迁移、任务分类与用户隔离机制
- 登录流程存在超管账户修复缺失与第三方登录入口不足问题
- 数据上传/编码模块缺少智能解析与预览功能

## 变更内容
- 新增 IT maintenance 迁移逻辑，支持 Weekly/Quarterly 频率映射与 equipment name 修复
- 修复 superadmin 登录自动修复种子账户、防止角色变更/删除
- 新增 Technical Support 自动同步至 IT Services 功能，实现任务隔离
- 上传/编码描述表格化自动格式化，支持智能分隔符检测与分列预览
- 新增 Vercel rewrites 配置与种子执行顺序修复确保部署可用

## 测试验证
- 已验证 superadmin 与现有用户登录流程正常
- 已验证 maintenance 迁移数据频率映射与字段兼容性
- 已验证 Technical Support 同步至 IT Services 任务隔离正确
- 已验证 Vercel 部署构建与路由正常工作

## 影响范围
- login 模块：种子账户修复逻辑、第三方登录图标新增
- executive_it/executive_task：增加任务隔离与同步功能
- Kalyxbackup：数据库结构更新与数据迁移脚本
- 全局样式与部署配置调整

## 回滚方案
- 回退 login/index.html、login/style.css 恢复登录界面
- 回退 Kalyxbackup 迁移脚本并还原数据库备份
- 回退 vercel.json 恢复原始路由配置
- 回退 seed 数据文件至上一版本

## Checklist
- [ ] 代码已自测，核心流程无阻塞
- [ ] 数据库迁移脚本已执行并验证
- [ ] Vercel 部署已通过构建
- [ ] 不同角色（superadmin、admin、executive）登录正常
- [ ] 维护迁移数据与现有数据兼容
- [ ] Technical Support 同步逻辑按 portal 隔离
