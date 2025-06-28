"use client";
import { Pet, PetType } from "@app/util";
import { useRouter } from "next/navigation";

export default function PetCard({ pet, showStatus = false }: { pet: Pet; showStatus?: boolean }) {
  const router = useRouter(); // 使用 useRouter hook
  function goToDetail() {
    router.push(`/pet/${pet.id}`);
  }
  return (
    <div onClick={goToDetail} className="w-full cursor-pointer h-full border border-orange-200 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
      <img src={pet.image} alt={`${pet.name}(${pet.type})`} className="w-full h-48 object-cover" />
      <div className="p-4">
        <h1 className="text-xl font-bold text-gray-800 mb-2">{(pet.type === PetType.Cat ? "😺" : pet.type === PetType.Dog ? "🐶" : "🐾") + pet.name}</h1>
        <p className="text-gray-600">{pet.description}</p>
      </div>
      {showStatus && (
        <div className="p-3 bg-gray-50 border-t">
          <p className="text-sm font-medium">Status: {pet.status}</p>
        </div>
      )}
    </div>
  );
}
