#!/bin/bash

# =============================================================================
# Validator Commission Oracle 简化部署脚本
# =============================================================================

set -e

echo "🚀 Validator Commission Oracle 部署"
echo "=================================="

# 检查依赖
echo "📋 检查依赖..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

if ! command -v sui &> /dev/null; then
    echo "❌ Sui CLI 未安装"
    exit 1
fi

echo "✅ 依赖检查通过"

# 检查钱包配置
echo "🔐 检查钱包配置..."
CURRENT_ADDRESS=$(sui client active-address 2>/dev/null || echo "")

if [ -z "$CURRENT_ADDRESS" ]; then
    echo "❌ 未配置Sui钱包"
    echo ""
    echo "请先配置你的Sui钱包："
    echo "1. 创建新钱包: sui client new-address ed25519"
    echo "2. 或导入现有钱包: sui client import-key ed25519 <私钥>"
    echo "3. 确保钱包有足够的SUI支付gas费"
    echo ""
    exit 1
fi

echo "✅ 当前钱包地址: $CURRENT_ADDRESS"
echo "⚠️  请确认这是你的钱包地址，合约将部署到这个地址下"
echo ""

# 读取配置
VALIDATOR_ADDRESS=$(jq -r '.validator_address' config.json 2>/dev/null || echo "0xb7ccff74eb345067c050f6f3d91d2def9cc89219558f5a1bdac866b2414ec248")

echo "📦 部署合约..."
sui client publish validator_commission --gas-budget 100000000 --json > deploy_result.json

if [ $? -eq 0 ]; then
    echo "✅ 合约部署成功"
    
    # 提取部署信息
    PACKAGE_ID=$(jq -r '.objectChanges[] | select(.type=="published") | .packageId' deploy_result.json)
    echo "Package ID: $PACKAGE_ID"
    
    echo "🏗️ 创建Oracle..."
    sui client call \
        --package "$PACKAGE_ID" \
        --module commission_oracle \
        --function create_oracle \
        --args "$VALIDATOR_ADDRESS" 1000000000 \
        --gas-budget 100000000 --json > create_result.json
    
    if [ $? -eq 0 ]; then
        ORACLE_ID=$(jq -r '.objectChanges[] | select(.objectType | contains("CommissionOracle")) | .objectId' create_result.json)
        OWNER_CAP_ID=$(jq -r '.objectChanges[] | select(.objectType | contains("OwnerCap")) | .objectId' create_result.json)
        
        echo "✅ Oracle创建成功"
        echo "Oracle ID: $ORACLE_ID"
        echo "OwnerCap ID: $OWNER_CAP_ID"
        
        # 保存配置
        cat > oracle_config.json << EOF
{
  "package_id": "$PACKAGE_ID",
  "oracle_id": "$ORACLE_ID",
  "owner_cap_id": "$OWNER_CAP_ID",
  "validator_address": "$VALIDATOR_ADDRESS",
  "deployer_address": "$CURRENT_ADDRESS",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
}
EOF
        
        echo "💾 配置已保存到 oracle_config.json"
        
        # 首次更新
        echo "🔄 执行首次Commission更新..."
        node commission_publisher.js "$VALIDATOR_ADDRESS"
        
        echo ""
        echo "🎉 部署完成！"
        echo "=================================="
        echo "Package ID: $PACKAGE_ID"
        echo "Oracle ID: $ORACLE_ID"
        echo "OwnerCap ID: $OWNER_CAP_ID"
        echo "部署地址: $CURRENT_ADDRESS"
        echo ""
        echo "📅 设置定时任务："
        echo "crontab -e"
        echo "添加以下行："
        echo "0 * * * * cd $(pwd) && node commission_publisher.js $VALIDATOR_ADDRESS"
        
    else
        echo "❌ Oracle创建失败"
        exit 1
    fi
else
    echo "❌ 合约部署失败"
    exit 1
fi
