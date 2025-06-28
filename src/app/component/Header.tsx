"use client";
import { DashboardOutlined, UserOutlined } from "@ant-design/icons";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";

const OWNER = "0x7856B9FA3a34b93dAf26Ffc10F0Aac34734C2662";
export default function Header() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  return (
    <header className="flex justify-between items-center p-6 bg-white shadow-md">
      <div>
        <h1 onClick={() => router.push("/")} className="text-3xl font-bold text-sky-400 cursor-pointer">
          Web3 Hackathon
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <ConnectButton />
        {isConnected && (
          <button onClick={() => router.push("/user")} className="p-2 rounded-full hover:bg-gray-100 transition-colors" title="用户中心">
            <UserOutlined className="text-gray-600 text-xl" />
          </button>
        )}
        {isConnected && address === OWNER && (
          <button onClick={() => router.push("/admin")} className="p-2 rounded-full hover:bg-gray-100 transition-colors" title="用户中心">
            <DashboardOutlined className="text-gray-600 text-xl" />
          </button>
        )}
      </div>
    </header>
  );
}
