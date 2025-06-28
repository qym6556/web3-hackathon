export interface Pet {
  id: number;
  name: string;
  type: PetType;
  breed: CatBreed | DogBreed | "Unknown";
  birth_date: string; // yyyy-mm
  image: string;
  description: string;
  status: PetStatus;
  health: HealthStatus;
  gender: "Male" | "Female";
  vaccinated?: boolean;
  neutered?: boolean;
  trained?: boolean;
  owner: `0x${string}`; // '0x7856B9FA3a34b93dAf26Ffc10F0Aac34734C2662'
  applicants: `0x${string}`[]; // ['0x7856B9FA3a34b93dAf26Ffc10F0Aac34734C2662']
  application_start_time: number; // timestamp
  token_uri: string;
  hasNFT: boolean;
}
export interface PetView extends Pet {
  id: number;
  name: string;
  type: PetType;
  breed: CatBreed | DogBreed | "Unknown";
  birth_date: string; // yyyy-mm
  image: string;
  description: string;
  status: PetStatus;
  health: HealthStatus;
  gender: "Male" | "Female";
  vaccinated?: boolean;
  neutered?: boolean;
  trained?: boolean;
  owner: `0x${string}`;
  applicants: `0x${string}`[];
  application_start_time: number;
  token_uri: string;
  hasNFT: boolean;
  age?: string;
  dead_line?: string;
  remain_seconds?: number;
  canHandle?: boolean;
}
export enum PetType {
  Cat = "cat",
  Dog = "dog",
  Other = "other",
}
export enum CatBreed {
  Persian = "Persian",
  Ragdoll = "Ragdoll",
}
export enum DogBreed {
  GermanShepard = "German Shepard",
  ShibaInu = "Shiba Inu",
}
export enum PetStatus {
  Adoptable = "adoptable",
  Adopted = "adopted",
  Pending = "pending",
}
export enum HealthStatus {
  Healthy = "healthy",
  Unhealthy = "unhealthy",
}
// export const mockPets: Pet[] = [
//   {
//     id: 1,
//     name: "cat 1",
//     type: PetType.Cat,
//     breed: CatBreed.Persian,
//     birth_date: "2025-01-01",
//     image: "images/cat1.png",
//     description: "A cat",
//     status: PetStatus.Adoptable,
//     health: HealthStatus.Healthy,
//     gender: "Male",
//     vaccinated: true,
//     neutered: false,
//     trained: false,
//     owner: "0x7856B9FA3a34b93dAf26Ffc10F0Aac34734C2662",
//     application: [],
//   },
//   {
//     id: 2,
//     name: "cat 2",
//     type: PetType.Cat,
//     breed: CatBreed.Ragdoll,
//     birth_date: "2024-03-01",
//     image: "images/cat2.png",
//     description: "A cat",
//     status: PetStatus.Adoptable,
//     health: HealthStatus.Healthy,
//     gender: "Female",
//     vaccinated: true,
//     neutered: false,
//     trained: false,
//     owner: "",
//     application: [],
//   },
//   {
//     id: 3,
//     name: "cat 3",
//     type: PetType.Cat,
//     breed: CatBreed.Ragdoll,
//     birth_date: "2024-03-01",
//     image: "images/cat3.png",
//     description: "A cat",
//     status: PetStatus.Adoptable,
//     health: HealthStatus.Healthy,
//     gender: "Male",
//     vaccinated: true,
//     neutered: false,
//     trained: false,
//     owner: "",
//     application: [],
//   },
//   {
//     id: 4,
//     name: "dog 1",
//     type: PetType.Dog,
//     breed: DogBreed.GermanShepard,
//     birth_date: "2024-03-01",
//     image: "images/dog1.png",
//     description: "A dog",
//     status: PetStatus.Adoptable,
//     health: HealthStatus.Healthy,
//     gender: "Male",
//     vaccinated: true,
//     neutered: false,
//     trained: false,
//     owner: "",
//     application: [],
//   },
//   {
//     id: 5,
//     name: "dog 2",
//     type: PetType.Dog,
//     breed: DogBreed.ShibaInu,
//     birth_date: "2024-03-01",
//     image: "images/dog2.png",
//     description: "A dog",
//     status: PetStatus.Adoptable,
//     health: HealthStatus.Healthy,
//     gender: "Male",
//     vaccinated: true,
//     neutered: true,
//     trained: true,
//     owner: "",
//     application: [],
//   },
//   {
//     id: 6,
//     name: "pet 1",
//     type: PetType.Other,
//     breed: "Unknown",
//     birth_date: "2023-03-21",
//     image: "images/pet1.png",
//     description: "A pet",
//     status: PetStatus.Adoptable,
//     health: HealthStatus.Healthy,
//     gender: "Male",
//     vaccinated: true,
//     neutered: false,
//     trained: false,
//     owner: "",
//     application: [],
//   },
// ];
