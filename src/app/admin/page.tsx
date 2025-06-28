"use client";
import Header from "../component/Header";
import { useState, useEffect, useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { Pet, PetStatus, PetType, PetView } from "../util";
import { createPublicClient, createWalletClient, custom, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import { watchContractEvent } from "viem/actions";
import AlertModal, { AlertType } from "@/app/component/AlertModal";
import SignModal from "../component/SignModal";

const MAX_WAIT_TIME = 100; // 5 minutes

export default function AdminPage() {
  const [pendingPets, setPendingPets] = useState<PetView[]>([]);
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [timers, setTimers] = useState<Record<number, NodeJS.Timeout>>({});
  const [publicClient, setPublicClient] = useState<any>(null);
  const [walletClient, setWalletClient] = useState<any>(null);
  const [alertState, setAlertState] = useState({
    isOpen: false,
    message: "",
    type: "info" as AlertType,
  });
  const [isSigned, setIsSigned] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { signMessageAsync } = useSignMessage();
  const [processingPetId, setProcessingPetId] = useState<number | null>(null);

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
  const abis = [
    "function sendRequest(string[] memory args) external returns (bytes32)",
    "function applyForAdoption(uint256 petId, address[] memory _applicants) public",
    "event RecordPet(uint256 petId)",
    "event confirmWinner(address winner)",
  ];
  const calculateRemainingSeconds = useCallback((application_start_time: number) => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    return Math.max(0, application_start_time + MAX_WAIT_TIME - nowSeconds);
  }, []);

  function startTimer(petId: number, initialSeconds: number) {
    // Clear existing timer
    if (timers[petId]) {
      clearInterval(timers[petId]);
    }

    // Set new timer
    const timerId = setInterval(() => {
      setPendingPets((prevPets) =>
        prevPets.map((pet) => {
          if (pet.id === petId && pet.remain_seconds !== undefined) {
            const newRemainingTime = Math.max(0, pet.remain_seconds - 1);
            if (newRemainingTime === 0) {
              clearInterval(timerId);
              return { ...pet, remain_seconds: 0, canHandle: true };
            }
            return { ...pet, remain_seconds: newRemainingTime };
          }
          return pet;
        })
      );
    }, 1000);

    // Save timer ID
    setTimers((prev) => ({ ...prev, [petId]: timerId }));
  }

  async function getPendingPets() {
    setLoading(true);
    const res = await fetch(`/api?status=${PetStatus.Pending}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    const petsWithTimers: PetView[] = data.map((pet: Pet) => ({
      ...pet,
      canHandle: getCanHandle(pet),
      remain_seconds: calculateRemainingSeconds(pet.application_start_time),
    }));

    setPendingPets(petsWithTimers);
    setLoading(false);
    petsWithTimers.forEach((pet: PetView) => {
      // if pet.remain_seconds < 3600, start timer
      if (pet?.remain_seconds && pet.remain_seconds > 0 && pet.remain_seconds < 3600) {
        startTimer(pet.id, pet.remain_seconds);
      }
    });
  }
  function getCanHandle(pet: PetView) {
    if (pet.applicants.length >= 3) {
      return true;
    }
    if (Math.floor(Date.now() / 1000) > pet.application_start_time + MAX_WAIT_TIME) {
      return true;
    }
    return false;
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
  async function handleSendTx(petId: number) {
    if (!publicClient || !walletClient) {
      console.log("publicClient or walletClient is not available");
      return;
    }
    try {
      // get abi
      const contractAbi = parseAbi(abis);

      if (!contractAbi || !contractAddress) {
        console.error("Contract address or ABI is not defined");
        return;
      }
      const unwatch1 = watchContractEvent(publicClient, {
        address: contractAddress,
        abi: contractAbi,
        eventName: "RecordPet",
        onLogs: (logs: any) => {
          logs.forEach((log: any) => {
            console.log("get RecordPet event:", log.args.petId);
            applyForWinner(petId);
            // unwatch1();
          });
        },
      });

      // publicClient -> simulate -> sendTransaction
      const { request } = await publicClient.simulateContract({
        address: contractAddress as `0x${string}`,
        abi: contractAbi,
        functionName: "sendRequest",
        args: [[petId]],
        account: address,
      });

      // walletClient -> sendTransaction
      const txHash = await walletClient.writeContract({
        ...request,
        account: address,
      });

      console.log("txHash", txHash);
      // wait for transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 6, // wait 1 block to confirm
      });

      // check if transaction was successful
      if (receipt.status === "success") {
        console.log("✅ transaction success");
        return "";
      } else {
        const txUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
        console.error(`❌ transaction failed, transaction url: ${txUrl}`);
      }
    } catch (error: any) {
      // Detailed error parsing
      console.error("transaction error:", JSON.stringify(error, null, 2));
    }
    return "";
  }

  async function applyForWinner(petId: number) {
    const applyAbis = ["function applyForAdoption(uint256 petId, address[] memory _applicants) public", "event confirmWinner(address winner)"];
    const pet = pendingPets.find((pet) => pet.id === petId);
    const applicants = pet?.applicants || [];
    try {
      const contractAbi = parseAbi(applyAbis);

      if (!contractAbi || !contractAddress) {
        console.error("Contract address or ABI is not defined");
        return;
      }
      const unwatch = watchContractEvent(publicClient, {
        address: contractAddress,
        abi: contractAbi,
        eventName: "confirmWinner",
        onLogs: (logs: any) => {
          logs.forEach((log: any) => {
            console.log("get confirmWinner event:", log.args.winner);
            updateOwner(petId, log.args.winner);
          });
          unwatch();
        },
      });

      const { request } = await publicClient.simulateContract({
        address: contractAddress as `0x${string}`,
        abi: contractAbi,
        functionName: "applyForAdoption",
        args: [petId, applicants],
        account: address,
      });
      // walletClient -> sendTransaction
      const txHash = await walletClient.writeContract({
        ...request,
        account: address,
      });

      console.log("txHash", txHash);
      // wait for transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1, // wait 1 block to confirm
      });

      // check if transaction was successful
      if (receipt.status === "success") {
        console.log("✅ apply winner success");
        return "";
      }
    } catch (error: any) {
      console.error("watch event error:", JSON.stringify(error, null, 2));
    }
  }
  async function updateOwner(petId: number, newOwner: string) {
    const res = await fetch("/api", {
      method: "POST",
      headers: {
        bearer: `Bearer ${localStorage.getItem("jwt") || ""}`,
      },
      body: JSON.stringify({ action: "updateOwner", address, petId, newOwner }),
    });
    if (res.status === 200) {
      const data = await res.json();
      setAlertState({
        isOpen: true,
        message: "update owner success",
        type: "success",
      });
      return data;
    }
    return "";
  }
  async function handleSign() {
    try {
      const message = `Welcome to Web3 Hackathon at ${new Date().toString()}`;
      const signature = await signMessageAsync({
        message,
        account: address,
      });
      const response = await fetch("/api", {
        method: "POST",
        body: JSON.stringify({ action: "auth", address, message, signature }),
      });
      if (response.status === 200) {
        const { jsonwebtoken } = await response.json();
        localStorage.setItem("jwt", jsonwebtoken);
        setIsSigned(true);
        setAlertState({
          isOpen: true,
          message: "sign success",
          type: "success",
        });
        initClient();
        return;
      }
    } catch (error) {
      console.error("Error signing:", error);
    } finally {
      setIsModalOpen(false);
    }
  }
  async function handleApprove(petId: number) {
    console.log("Approving pet:", petId);
    if (!isSigned) {
      setIsModalOpen(true);
      return;
    }
    setProcessingPetId(petId);
    try {
      await handleSendTx(petId);
      // Clear the timer for this pet
      if (timers[petId]) {
        clearInterval(timers[petId]);
        const newTimers = { ...timers };
        delete newTimers[petId];
        setTimers(newTimers);
      }
    } catch (error) {
      console.error("handle approve error:", error);
    } finally {
      setProcessingPetId(null);
    }
  }

  function calculateRemainingTime(remainTotalSeconds: number) {
    const remainSeconds = remainTotalSeconds % 60;
    const remainMinutes = Math.floor(remainTotalSeconds / 60);
    const remainHours = Math.floor(remainMinutes / 60);
    const remainDay = Math.floor(remainHours / 24);
    const remainMonth = Math.floor(remainDay / 30);

    if (remainMonth > 0) {
      return `more than ${remainMonth} month`;
    }
    if (remainDay > 0) {
      return `more than ${remainDay} day`;
    }
    if (remainHours > 0) {
      return `more than ${remainHours} hour`;
    }
    return `${remainMinutes}:${remainSeconds < 10 ? "0" : ""}${remainSeconds}`;
  }

  useEffect(() => {
    if (isConnected && address) {
      getPendingPets();
    }
  }, [address]);

  useEffect(() => {
    return () => {
      console.log("update timers:" + JSON.stringify(timers));
      Object.values(timers).forEach((timer) => clearInterval(timer));
    };
  }, [timers]);

  if (loading)
    return (
      <>
        <Header />
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="text-center mt-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-sky-400 border-t-transparent mb-4"></div>
            <p className="text-gray-600 text-lg">The pending data is being loaded...</p>
            <p className="text-gray-400 text-sm mt-2">Waiting...</p>
          </div>
        </div>
      </>
    );

  return (
    <>
      <Header />
      <div className="container mx-auto p-4 mt-8">
        <h1 className="text-2xl font-bold mb-6">Pending Pets</h1>
        {pendingPets.length === 0 ? (
          <div className="text-center mt-8">
            <p className="text-gray-600 text-lg">No pending pets</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingPets.map((pet) => (
              <div key={pet.id} className="border rounded-lg p-4 shadow">
                <div className="relative h-48 w-full">
                  <img src={pet.image} alt={pet.name} className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 left-2 bg-white/80 px-2 py-1 rounded-full text-sm font-medium">{pet.type === PetType.Cat ? "🐱" : pet.type === PetType.Dog ? "🐶" : "🐾"}</div>
                </div>
                <h2 className="text-xl font-semibold">{pet.name}</h2>
                {pet.remain_seconds !== undefined && pet.remain_seconds > 0 && <p className="text-gray-600 mb-2">Deadline Time: {calculateRemainingTime(pet.remain_seconds)}</p>}
                <div className="flex justify-between mt-4">
                  <button
                    onClick={() => handleApprove(pet.id)}
                    disabled={!pet.canHandle || processingPetId === pet.id}
                    className={`px-4 py-2 rounded text-white flex items-center justify-center min-w-[80px] ${
                      !pet.canHandle ? "bg-gray-400 cursor-not-allowed" : processingPetId === pet.id ? "bg-blue-500" : "bg-green-500 hover:bg-green-600"
                    }`}
                  >
                    {processingPetId === pet.id ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        dealing
                      </>
                    ) : (
                      "handle"
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <SignModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onApprove={handleSign} />
      <AlertModal isOpen={alertState.isOpen} type={alertState.type} message={alertState.message} onClose={() => setAlertState({ ...alertState, isOpen: false })} />
    </>
  );
}
