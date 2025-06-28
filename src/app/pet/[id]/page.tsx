"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Pet, PetStatus, PetType, PetView } from "@/app/util";
import { useAccount, useSignMessage } from "wagmi";
import SignModal from "@/app/component/SignModal";
import AlertModal, { AlertType } from "@/app/component/AlertModal";
import Header from "@/app/component/Header";
export default function PetPage({ params }: { params: { id: string } }) {
  const [pet, setPet] = useState<PetView | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [alertState, setAlertState] = useState({
    isOpen: false,
    message: "",
    type: "info" as AlertType,
  });

  async function getPetInfo() {
    try {
      const res = await fetch("/api?id=" + params.id, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      updatePetView(data);
      setLoading(false);
    } catch (error) {
      console.error("initAdoptableList error:", error);
    }
  }
  function updatePetView(data: Pet) {
    if (!data) {
      setPet(null);
      setLoading(false);
      return;
    }
    // calculate foundPet?.birthDate = 2012-01 => 1 year | 1 month
    const age = getAge(data.birth_date);
    const petView = {
      ...data,
      age,
    };
    setPet(petView);
  }

  async function adpot() {
    const res = await fetch("/api", {
      method: "POST",
      headers: {
        bearer: `Bearer ${localStorage.getItem("jwt") || ""}`,
      },
      body: JSON.stringify({ action: "adopt", address, petId: pet?.id }),
    });
    if (res.status === 200) {
      const data = await res.json();
      return data;
    }
    return "";
  }

  // Handle adoption application
  async function handleApply() {
    if (!isConnected) {
      setAlertState({
        isOpen: true,

        message: "please connect wallet first",
        type: "error",
      });
      return;
    }

    if (address && pet?.applicants.includes(address as `0x${string}`)) {
      setAlertState({
        isOpen: true,
        message: "you have applied before",
        type: "error",
      });
      return;
    }
    const adpotData = await adpot();
    if (!adpotData) {
      return;
    }
    updatePetView(adpotData);
    setAlertState({
      isOpen: true,
      message: "apply success",
      type: "success",
    });
  }
  useEffect(() => {
    if (!params.id) {
      return;
    }
    getPetInfo();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400 mb-4"></div>
          <p className="text-gray-600">Loading pet details...</p>
        </div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Pet Not Found</h1>
        <p className="text-gray-600 mb-8">We couldn't find a pet with the ID: {params.id}</p>
        <button onClick={() => router.push("/")} className="bg-sky-400 hover:bg-sky-500 text-white font-medium py-2 px-4 rounded-md transition-colors">
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Header />
        {pet.status !== PetStatus.Adopted && address && pet.owner !== address && !pet.applicants.includes(address) && (
          <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-10 hidden md:block">
            <button
              onClick={handleApply}
              className="bg-sky-400 hover:bg-sky-500 text-white font-bold py-4 px-6 rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              Apply for adoption
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start py-8">
          {/* Pet image section */}
          <div className="w-[580px] rounded-xl overflow-hidden shadow-lg transform transition-transform duration-500 hover:scale-[1.02]">
            <Image src={`/${pet.image}`} alt={pet.name} width={600} height={400} className="w-full h-auto object-cover" />
          </div>
          {/* Pet detail section */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center">
                {pet.type === PetType.Cat ? "😺" : pet.type === PetType.Dog ? "🐶" : "🐾"} {pet.name}
              </h1>
              <p className="text-xl text-gray-600 mt-1">
                {pet.breed} • {pet.age} old
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{pet.gender}</span>
              {pet.vaccinated && <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Vaccinated</span>}
              {pet.neutered && <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Neutered</span>}
              {pet.trained && <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Trained</span>}
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">About {pet.name}</h2>
              <p className="text-gray-700 leading-relaxed">{pet.description}</p>
            </div>
          </div>
        </div>

        {/* pet other info */}
        <div className="mt-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Why {pet.name} would make a great companion</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-3">❤️</div>
              <h3 className="text-xl font-semibold mb-2">Friendly Nature</h3>
              <p className="text-gray-600">{pet.name} gets along well with children and other pets.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-3">🏡</div>
              <h3 className="text-xl font-semibold mb-2">Home Trained</h3>
              <p className="text-gray-600">{pet.name} is well-behaved and knows basic commands.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-3">⚕️</div>
              <h3 className="text-xl font-semibold mb-2">Healthy</h3>
              <p className="text-gray-600">Up-to-date on all vaccinations and veterinary checkups.</p>
            </div>
          </div>
        </div>
      </div>
      <AlertModal isOpen={alertState.isOpen} type={alertState.type} message={alertState.message} onClose={() => setAlertState({ ...alertState, isOpen: false })} />
    </>
  );
}

// Calculate pet age from birth date
function getAge(birthDate: string) {
  // birthDate format: YYYY-MM
  const birthDateObj = new Date(birthDate);
  const currentDate = new Date();
  const ageInYears = currentDate.getFullYear() - birthDateObj.getFullYear();
  const ageInMonths = currentDate.getMonth() - birthDateObj.getMonth();
  // less than 1 month
  if (ageInYears === 0 && ageInMonths === 0) {
    return "Less than a month";
  }
  // 1 month
  if (ageInYears === 0 && ageInMonths === 1) {
    return "1 month";
  }

  // more than 1 month, less than 1 year
  if (ageInYears === 0 && ageInMonths > 1) {
    return `${ageInMonths} months`;
  }
  // 1 year
  if (ageInYears === 1) {
    return "1 year";
  }
  // more than 1 year
  if (ageInYears > 1) {
    return `${ageInYears} years`;
  }
  return "Unknown";
}
