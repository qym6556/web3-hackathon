"use client";
import { useEffect, useState } from "react";
import { Pet, PetStatus, PetType } from "@app/util";
import { useAccount } from "wagmi";
import PetCard from "../component/PetCard";
import Header from "../component/Header";
import { sepolia } from "viem/chains";
import { createPublicClient, createWalletClient, custom, parseAbi } from "viem";
import { watchContractEvent } from "viem/actions";

export default function UserPage() {
  const [loading, setLoading] = useState(true);
  const [pendingPets, setPendingPets] = useState<Pet[]>([]);
  const [adoptedPets, setAdoptedPets] = useState<Pet[]>([]);
  const { address, isConnected } = useAccount();
  const [publicClient, setPublicClient] = useState<any>(null);
  const [walletClient, setWalletClient] = useState<any>(null);
  const nftAbi = [
    "function safeMint(uint256 petId, string memory uri) public returns (uint256)",
    "function balanceOf(address owner) view returns (uint256)",
    "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
    "function tokenURI(uint256 tokenId) view returns (string)",
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  ];
  const parsedAbi = parseAbi(nftAbi);
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

  async function fetchUserNFTs() {
    if (!publicClient) return;

    const balance = await publicClient.readContract({
      address: contractAddress,
      abi: parsedAbi,
      functionName: "balanceOf",
      args: [address],
    });

    const tokenIds = [];
    for (let i = 0; i < Number(balance); i++) {
      const tokenId = await publicClient.readContract({
        address: contractAddress,
        abi: parsedAbi,
        functionName: "tokenOfOwnerByIndex",
        args: [address, i],
      });
      tokenIds.push(tokenId);
    }
    const nfts = await Promise.all(
      tokenIds.map(async (tokenId) => {
        const uri = await publicClient.readContract({
          address: contractAddress,
          abi: parsedAbi,
          functionName: "tokenURI",
          args: [tokenId],
        });
        console.log("uri:" + uri);
        const resolvedUri = uri.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${uri.replace("ipfs://", "")}` : uri;

        const metadata = await fetch(resolvedUri).then((res) => res.json());
        return { tokenId, metadata };
      })
    );
    console.log(nfts);
    return nfts;
  }
  async function loadUseInfo() {
    if (!address) return;
    const pendingPets: Pet[] = [];
    const adoptedPets: Pet[] = [];
    const res = await fetch("/api", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    for (const pet of data) {
      if (pet.status === PetStatus.Adopted && pet.owner === address) {
        adoptedPets.push(pet);
      } else if (pet.status === PetStatus.Pending && pet.applicants.includes(address)) {
        pendingPets.push(pet);
      }
    }
    setPendingPets(pendingPets);
    setAdoptedPets(adoptedPets);
    initClient();
    setLoading(false);
  }

  function initClient() {
    if (typeof window !== "undefined" && window.ethereum) {
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: custom(window.ethereum),
      });
      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum),
      });
      setPublicClient(publicClient);
      setWalletClient(walletClient);
    } else {
      console.log("window.ethereum is not available");
    }
  }
  async function updatePetNFT(petId: number) {
    const res = await fetch("/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "updateNFT",
        petId,
      }),
    });
    if (res.status === 200) {
      const data = await res.json();
      setAdoptedPets(adoptedPets.map((item) => (item.id === petId ? data : item)));
    }
  }
  async function handleGetNFT(pet: Pet) {
    try {
      if (!contractAddress || !parsedAbi) {
        throw new Error("Contract address or NFT ABI is missing");
      }
      if (!isConnected) {
        throw new Error("Wallet is not connected");
      }
      // publicClient -> simulate -> sendTransaction
      const { request } = await publicClient.simulateContract({
        address: contractAddress as `0x${string}`,
        abi: parsedAbi,
        functionName: "safeMint",
        args: [pet.id, pet.token_uri],
        account: address,
      });

      // walletClient -> sendTransaction
      const txHash = await walletClient.writeContract({
        ...request,
        account: address,
        gas: request.gas,
      });
      const unwatch = watchContractEvent(publicClient, {
        address: contractAddress,
        abi: parsedAbi,
        eventName: "Transfer",
        onLogs: (logs: any) => {
          logs.forEach((log: any) => {
            console.log(log);
            if (log.args.tokenId === BigInt(pet.id)) {
              console.log("NFT minted successfully! tokenId:" + log.args.tokenId);
              unwatch();
              updatePetNFT(pet.id);
            }
          });
        },
      });
      console.log("txHash", txHash);
      // wait for transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 3, // wait 1 block to confirm
      });

      // check if transaction was successful
      if (receipt.status === "success") {
        console.log("✅ transaction success");
        return "";
      } else {
        const txUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
        console.error(`❌ transaction failed, transaction url: ${txUrl}`);
      }
    } catch (error) {}
  }

  useEffect(() => {
    if (!address) return;
    loadUseInfo();
  }, [address]);
  useEffect(() => {
    if (publicClient) {
      fetchUserNFTs();
    }
  }, [publicClient]);
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <Header />
      {!isConnected ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center p-8 bg-white rounded-xl shadow-sm max-w-md w-full">
            <h1 className="text-2xl font-bold text-indigo-600 mb-4">Connect Your Wallet</h1>
            <p className="text-gray-600">Please connect your wallet to view your pets</p>
          </div>
        </div>
      ) : (
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Pets in pending */}

          <section className="mb-12 p-8 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Pending Applications</h2>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">{pendingPets.length} pets</span>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mb-3"></div>
                <p className="text-gray-600">Loading your applications...</p>
              </div>
            ) : pendingPets.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No pending applications</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {pendingPets.map((pet) => (
                  <PetCard key={pet.id} pet={pet} showStatus={true} />
                ))}
              </div>
            )}
          </section>

          {/* Adopted pets */}

          <section className="p-8 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Your Adopted Pets</h2>
              <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">{adoptedPets.length} pets</span>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mb-3"></div>
                <p className="text-gray-600">Loading your pets...</p>
              </div>
            ) : adoptedPets.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">You haven't adopted any pets yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {adoptedPets.map((pet) => (
                  <div key={pet.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    {/* Pet Image */}
                    <div className="relative h-48 w-full">
                      <img src={pet.image} alt={pet.name} className="w-full h-full object-cover" />
                      <div className="absolute bottom-2 left-2 bg-white/80 px-2 py-1 rounded-full text-sm font-medium">{pet.type === PetType.Cat ? "🐱" : pet.type === PetType.Dog ? "🐶" : "🐾"}</div>
                    </div>
                    <div className="p-4 border-t bg-gray-50">
                      <h3 className="font-medium text-gray-800 mb-2">Pet NFT</h3>
                      <div className="mt-2 p-3 bg-white rounded border border-gray-200">
                        <p className="text-sm text-gray-600 mb-1">
                          Contract: {process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.slice(0, 6)}...{process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.slice(-4)}
                        </p>
                        <p className="text-sm text-gray-600">Token ID: {pet.id}</p>
                        {!pet.hasNFT && (
                          <button
                            onClick={() => handleGetNFT(pet)}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 px-4 rounded-md mt-3 hover:opacity-90 transition-opacity"
                          >
                            Mint NFT
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      )}
    </div>
  );
}
