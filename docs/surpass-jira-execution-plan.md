# AcuGuard「超越 Jira」落地执行规划

> 目标：在 2 个季度内，把当前 AI Jira-like MVP 升级为“可运营、可扩展、可自动化”的工程协作系统。

## 0. 设计边界与不变式

- **边界**：单租户产品起步，优先支持中小研发团队（10~300人）。
- **状态显式**：工作流、权限、自动化规则、审计事件均以数据库实体表达。
- **可观测失败**：所有异步任务必须有状态机（queued/running/succeeded/failed）与错误原因。
- **幂等边界**：Webhook、重试、评论生成等写操作必须支持幂等键。
- **演进兼容**：关键表结构变更保持向后兼容（新增字段默认值、版本化 API）。

## 1. 超越 Jira 的核心能力与分期

## Phase 1（P0，4~6周）：把“能跑”升级为“能上生产”

1. **PostgreSQL 全量落地**
   - 替换 `mock-data.ts` 读写为 Drizzle + PostgreSQL。
   - 提供 migration + seed + rollback 手册。
   - Done 定义：核心 API（项目/问题/评论）100% 数据持久化。

2. **可配置工作流引擎（第一版）**
   - 支持状态集、转移规则、角色约束、必填字段校验。
   - Done 定义：每个项目可独立配置 workflow schema。

3. **基础 RBAC（项目级）**
   - 角色：Owner / Maintainer / Contributor / Viewer。
   - Done 定义：所有写接口强制鉴权并有拒绝日志。

4. **审计日志（不可变）**
   - 记录 issue 字段变更、状态变化、评论事件。
   - Done 定义：任意 issue 可追溯“谁在何时改了什么”。

## Phase 2（P1，4~8周）：形成 Jira 不具备的 AI 原生效率

1. **AI 工作流编排器**
   - 自动拆分子任务、风险识别、优先级建议并可人工覆写。
   - 引入“建议采纳率”与“建议回滚率”指标。

2. **语义搜索 + Query DSL**
   - 文本检索 + 向量召回 + 结构化筛选。
   - 保存查询模板，支持团队共享视图。

3. **通知中心与订阅系统**
   - @提及、状态变更、SLA 临界触发。
   - 站内信优先，异步扩展到邮件/Webhook。

4. **自动化规则引擎（If-This-Then-That）**
   - 事件触发器 + 条件 + 动作（改字段/派发任务/调用外部 webhook）。

## Phase 3（P2，持续）：企业级运营能力

1. **SLO + 限流 + 重试策略**
   - API 级 SLI（延迟/错误率），队列积压告警。
   - 幂等冲突、重试次数、死信队列可观测。

2. **集成平台**
   - 入站：GitHub/GitLab/CI。
   - 出站：Webhook、事件总线、数据导出。

3. **多项目治理与成本可见性**
   - 跨项目依赖图、吞吐看板、周期时间、WIP 违约预警。

## 2. 数据模型增量（相对当前 MVP）

新增建议核心表：

- `workflows`, `workflow_states`, `workflow_transitions`
- `project_members`, `role_bindings`
- `issue_events`（append-only）
- `subscriptions`, `notifications`
- `automation_rules`, `automation_runs`
- `idempotency_keys`
- `async_jobs`, `dead_letter_jobs`

## 3. 关键风险与缓解

1. **规则引擎复杂度失控**
   - 缓解：规则语法限制 + 执行超时 + 沙箱化动作模板。
2. **AI 建议不稳定导致信任下降**
   - 缓解：建议可解释、可回滚、可关闭，默认 human-in-the-loop。
3. **事件风暴造成通知噪音**
   - 缓解：订阅粒度与聚合窗口（digest）。

## 4. 验收指标（“超越 Jira”判定）

- Lead time 降低 ≥ 20%。
- 需求拆分耗时降低 ≥ 30%。
- 自动化规则覆盖 ≥ 40% 的重复性流程动作。
- 审计追踪查询成功率 100%。
- 关键 API 可用性 ≥ 99.9%。

## 5. 与现有任务组对齐

建议将 `npm run taskgroup:jira-gap` 从“差距列表输出”升级为“执行看板输出”：

- 当前阶段（P0/P1/P2）
- 每项能力状态（todo/in-progress/done/blocked）
- 最近一次验证时间戳
- 失败项的 remediation 提示


## 6. 当前还需要补齐的 Jira 主要功能清单（可直接转 Jira Epic）

按上线优先级排序：

1. **数据持久化闭环（P0）**
   - API 从 mock 数据迁移到 PostgreSQL（含 migration/seed/rollback）。
2. **工作流引擎（P0）**
   - 项目级状态机、流转约束、必填校验。
3. **项目级权限（P0）**
   - Owner/Maintainer/Contributor/Viewer 写操作鉴权与拒绝审计。
4. **不可变审计日志（P0）**
   - 记录字段变更、状态变更、评论行为，支持追溯。
5. **通知与订阅（P1）**
   - @提及/状态变更/SLA 触发，支持站内消息与外发通道。
6. **搜索与 Query DSL（P1）**
   - 结构化筛选 + 语义召回 + 保存视图。
7. **自动化规则引擎（P1）**
   - 事件触发 + 条件判断 + 动作执行（字段更新/派单/Webhook）。
8. **运维可靠性能力（P2）**
   - SLO、限流、重试、幂等键、死信队列与可观测告警。
9. **集成平台（P2）**
   - GitHub/GitLab/CI 入站，Webhook/导出出站。

> 建议：将上述 9 项按“Epic -> Story -> 验收指标”拆分，并与第 4 节指标（lead time、可用性等）建立一一映射。
