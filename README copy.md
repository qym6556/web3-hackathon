# 🐾 Web3 宠物领养平台

![Banner](https://via.placeholder.com/1200x400?text=Web3+Pet+Adoption)

一个基于区块链的去中心化宠物领养平台，利用智能合约和 Chainlink 服务实现公平透明的领养流程。

## 🛠️ 技术架构

### 前端技术栈

| 技术                                                                                 | 说明                 |
| ------------------------------------------------------------------------------------ | -------------------- |
| ![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js)              | 基于 App Router 架构 |
| ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss) | 原子化 CSS 框架      |
| ![RainbowKit](https://img.shields.io/badge/RainbowKit-2.2-FF6B6B)                    | 钱包连接解决方案     |
| ![Viem](https://img.shields.io/badge/Viem-2.3-6E3FFC)                                | 区块链交互库         |

### 后端技术栈

| 技术                                                                               | 说明         |
| ---------------------------------------------------------------------------------- | ------------ |
| ![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8F?logo=supabase) | 后端即服务   |
| ![JWT](https://img.shields.io/badge/JWT-9.0-000000?logo=jsonwebtokens)             | 钱包签名认证 |

### 区块链技术栈

| 技术                                                                                     | 说明         |
| ---------------------------------------------------------------------------------------- | ------------ |
| ![Solidity](https://img.shields.io/badge/Solidity-0.8-363636?logo=solidity)              | 智能合约语言 |
| ![Chainlink](https://img.shields.io/badge/Chainlink-Functions/VRF-375BD2?logo=chainlink) | 去中心化服务 |
| ![Sepolia](https://img.shields.io/badge/Sepolia-Testnet-6B7280)                          | 以太坊测试网 |

## ✨ 核心功能

### 宠物展示

- 🐶 可领养宠物列表
- 📝 宠物详情页（图片、描述、健康状态等）

### 领养流程

1. 用户申请领养，在限制时间内可多个用户申请
2. 智能合约随机选择领养者
3. 🎉 获胜者获得宠物，可在用户中心领取 NFT

### 管理后台

- 🔍 审核待领养宠物
- ⚡ 触发 Chainlink Functions 记录申请者
  - 当申请人数达到上限或者时间超过限制，触发随机选择领养者
- ⚡ 触发 Chainlink VRF 随机选择领养者

### 用户中心

- 🖼️ 查看已领养宠物
- 🏷️ 管理 NFT 收藏

## 📂 项目结构

├── contracts/ # 智能合约代码
│ └── PetAdoption.sol # 主合约
├── src/
│ ├── app/ # Next.js 应用
│ │ ├── admin/ # 管理后台
│ │ ├── pet/[id]/ # 宠物详情页
│ │ ├── user/ # 用户中心
│ │ └── api/ # API 路由
| | └── page.tsx # 主页，展示可领养宠物
│ └── wagmi.ts # 钱包配置
├── public/ # 静态资源
└── uploadSecretToDon.js # Chainlink 密钥上传脚本

🚀 快速开始

## 本地开发

1. 克隆项目:

```bash
git clone https://github.com/qym6556/web3-hackathon.git
```

2. 安装依赖:

```bash
npm install
```

3. 配置环境变量: 创建.env.local 文件，包含:

```ini
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
ETHEREUM_PROVIDER_ETHEREUM_SEPOLIA=sepolia_test_rpc_url
EVM_PRIVATE_KEY=your_wallet_private_key
```

4. 部署合约: 暂时用的 Remix 部署，后续需要用 hardhat 部署

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

5. 上传 chainlink 密钥：

```bash
node uploadSecretToDon.js
```

6. 调用合约方法，设置合约需要的配置项：暂时在 Remix 上完成的，后续用 hardhat 设置

7. 启动开发服务器:

```bash
npm run dev
```

## 🔮 未来计划

- 实现流浪宠物的上传
- 实现宠物 NFT 自动更新
- 集成 IPFS 存储宠物图片
- 添加 DAO 治理功能
