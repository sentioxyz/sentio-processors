# Validator Commission Oracle - 简化部署包

## 🚀 快速开始

### 1. 配置你的 Sui 钱包

首先确保你配置了自己的 Sui 钱包：

```bash
# 创建新钱包
sui client new-address ed25519

# 或导入现有钱包
sui client import-key ed25519 <你的私钥>

# 检查当前钱包地址
sui client active-address
```

**重要：** 确保钱包有足够的 SUI 支付 gas 费！

### 2. 修改配置

编辑 `config.json`，将 `validator_address` 改为你要监控的验证者地址：

```json
{
  "validator_address": "你的验证者地址",
  "rpc_url": "https://sui-mainnet-endpoint.blockvision.org",
  "gas_budget": 100000000,
  "update_interval_hours": 1
}
```

### 3. 一键部署

```bash
chmod +x deploy.sh
./deploy.sh
```

这个脚本会：

- 检查你的钱包配置
- 部署合约到你的钱包地址
- 创建 Oracle 并执行首次更新
- 提供定时任务设置说明

### 4. 设置定时任务

部署完成后，设置每小时自动更新：

```bash
crontab -e
```

添加以下行（替换为你的实际路径）：

```
0 * * * * cd /path/to/validator_commission_simple\ 2 && node commission_publisher.js 你的验证者地址
```

## 📁 文件说明

- `deploy.sh` - 一键部署脚本
- `commission_publisher.js` - 佣金发布脚本
- `config.json` - 配置文件
- `validator_commission/` - Move 合约源码

## 🔧 依赖要求

- Node.js
- Sui CLI

---

**就这么简单！** 🎯

部署完成后，系统会每小时自动更新验证者的佣金数据。
