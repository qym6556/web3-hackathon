"use client";
import PetCard from "./component/PetCard";
import { useEffect, useState } from "react";
import { Pet, PetStatus } from "@app/util";
import Header from "./component/Header";

export default function Home() {
  const [initialized, setInitialized] = useState(false);
  const [adoptableList, setAdoptableList] = useState<Pet[]>([]);
  const [adoptedList, setAdoptedList] = useState<Pet[]>([]);
  const [pendingList, setPendingList] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(false);
  async function initPetsList() {
    try {
      setLoading(true); // 开始加载
      const res = await fetch("/api", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      filterPetList(data);
      setInitialized(true);
    } catch (error) {
      console.error("initAdoptableList error:", error);
    } finally {
      setLoading(false); // 加载完成
    }
  }
  function filterPetList(data: Pet[]) {
    const adoptableList: Pet[] = [];
    const adoptedList: Pet[] = [];
    const pendingList: Pet[] = [];
    data.forEach((pet) => {
      if (pet.status === PetStatus.Adopted) {
        adoptedList.push(pet);
      } else if (pet.status === PetStatus.Pending) {
        pendingList.push(pet);
      } else {
        adoptableList.push(pet);
      }
    });
    setAdoptableList(adoptableList);
    setAdoptedList(adoptedList);
    setPendingList(pendingList);
  }
  useEffect(() => {
    if (!initialized) {
      initPetsList();
    }
  }, []);
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-100 to-white">
        <header className="flex justify-between items-center p-6 bg-white shadow-md">{/* ... existing header ... */}</header>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 to-white">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <section className="mb-8 p-6 bg-white rounded-lg shadow-md" id="pet-adoption-pending-area">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Adoptable Pets</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adoptableList.map((pet) => (
              <li key={pet.id}>
                <PetCard pet={pet} />
              </li>
            ))}
          </ul>
        </section>
        {pendingList.length > 0 && (
          <section className="mb-8 p-6 bg-white rounded-lg shadow-md" id="pet-adoption-pending-area">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Pending Adoption</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingList.map((pet) => (
                <li key={pet.id}>
                  <PetCard pet={pet} />
                </li>
              ))}
            </ul>
          </section>
        )}
        {adoptedList.length > 0 && (
          <section className="mb-8 p-6 bg-white rounded-lg shadow-md" id="pet-adoption-pending-area">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Adopted Pets</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adoptedList.map((pet) => (
                <li key={pet.id}>
                  <PetCard pet={pet} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
