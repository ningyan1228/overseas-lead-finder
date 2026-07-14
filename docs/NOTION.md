# Notion 数据库配置

将同一个 Notion Integration 连接到一个空白父页面，随后运行 `npm run notion:setup`。脚本会在该页面下创建五个数据库，并在终端输出 `.env` 所需的 ID。脚本不会把 Token 或 ID 写入任何文件。

| 数据库 | 用途 | 关键字段 |
|---|---|---|
| Products | 产品和关键词规则 | English Name、Applications、Company Types、Custom Keywords、Exclude Keywords |
| Search Tasks | 唯一的持久任务队列 | Product、Status、Progress、Keywords、统计字段 |
| Companies | 按根域名去重的客户 | Domain、Lead Score、Lead Grade、Source Task、Evidence URL |
| Contacts | 后续公开商业联系人解析 | Company、Email Status、Confidence、Source URL |
| Sources | 搜索与官网证据 | Company、Task、Page URL、Search Keyword、Evidence Text |

当前 MVP 已使用 Products、Search Tasks 和 Companies。Contacts、Sources 已建好，供后续官网页面解析与联系人功能使用。

如果你已有 Notion 数据库，可不运行建库脚本；按字段名建立对应属性，然后将数据库 ID 填写进 `.env`。属性名不同的场景，应在 `server/src/repositories/` 集中映射，不要让业务代码直接依赖 Notion 属性名称。

