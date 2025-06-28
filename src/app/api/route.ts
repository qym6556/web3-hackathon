import { verifyMessage } from "viem";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { PetStatus } from "../util";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
// async function insertPet() {
//   const { data, error } = await supabase.from("PetInfo").insert(mockPets[5]).select(); // 返回插入的数据

//   if (error) {
//     console.error("插入失败:", error);
//     return null;
//   }
//   return data;
// }
const TABLE_NAME = "PetInfo";
// get all pets
async function getPets() {
  const { data, error } = await supabase.from(TABLE_NAME).select("*").order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

// get pet by id
async function getPetById(id: number) {
  const { data, error } = await supabase.from(TABLE_NAME).select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}
async function getPetsByStatus(status: PetStatus) {
  const { data, error } = await supabase.from(TABLE_NAME).select("*").eq("status", status);
  if (error) throw error;
  return data;
}
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get("id") || "");
  if (id) {
    const data = await getPetById(id);
    return new Response(JSON.stringify(data), { status: 200 });
  }
  const status = url.searchParams.get("status") as PetStatus;
  if (status) {
    const data = await getPetsByStatus(status);
    return new Response(JSON.stringify(data.filter((pet) => pet.status === status)), { status: 200 });
  }
  const data = await getPets();
  return new Response(JSON.stringify(data), { status: 200 });
}

async function adopt(address: string, petId: number) {
  // 首先获取当前application数组
  const { data: petData, error: fetchError } = await supabase.from(TABLE_NAME).select("*").eq("id", petId).single();
  if (fetchError) throw fetchError;

  // 检查是否已经申请过
  if (petData.applicants.includes(address)) {
    throw new Error("Address already in applicants list");
  }
  if (petData.applicants.length == 3) {
    throw new Error("Pet apply is full");
  }
  // 使用安全的方式更新数组
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      applicants: [...petData.applicants, address],
      status: petData.status === PetStatus.Adoptable ? PetStatus.Pending : petData.status,
      application_start_time: petData.application_start_time || Math.floor(Date.now() / 1000),
    })
    .eq("id", petId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
async function updateOwner(petId: number, newOwner: string) {
  const { data: petData, error: fetchError } = await supabase.from(TABLE_NAME).select("*").eq("id", petId).single();
  if (fetchError) throw fetchError;
  if (petData.owner === newOwner) {
    throw new Error("Same owner");
  }
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      owner: newOwner,
      status: PetStatus.Adopted,
      applicants: [],
      application_start_time: 0,
    })
    .eq("id", petId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
async function updateNFT(petId: number) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      hasNFT: true,
    })
    .eq("id", petId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
export async function POST(request: Request) {
  const body = await request.json();
  const { action, address } = body;
  console.log(body);

  if (action === "auth") {
    const { address, message, signature } = body;

    const isValid = await verifyMessage({
      address,
      message,
      signature,
    });
    if (!isValid) {
      return new Response(JSON.stringify({ message: "Invalid signature" }), { status: 400 });
    } else {
      const token = jwt.sign({ address }, process.env.JWT_SECRET || "", { expiresIn: "1h" });
      return new Response(
        JSON.stringify({
          message: "Valid signature",
          jsonwebtoken: token,
        }),
        { status: 200 }
      );
    }
  } else if (action === "adopt") {
    const { petId } = body;
    try {
      const data = await adopt(address, petId);
      return new Response(JSON.stringify(data), { status: 200 });
    } catch (error) {
      console.log("adopt error:", error);
      return new Response(JSON.stringify({ message: "Adopt failed" }), { status: 400 });
    }
  } else if (action === "updateNFT") {
    try {
      const { petId } = body;
      const data = await updateNFT(petId);
      return new Response(JSON.stringify(data), { status: 200 });
    } catch (error) {
      console.log("updateNFT error:", error);
      return new Response(JSON.stringify({ message: "Update NFT failed" }), { status: 400 });
    }
  }
  // check if the token is valid
  const token = request.headers.get("bearer")?.split(" ")[1];
  if (!token) {
    return new Response(JSON.stringify({ message: "Token is required" }), { status: 401 });
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as { address: string };
  if (decoded.address.toLocaleLowerCase() !== address.toLocaleLowerCase()) {
    return new Response(JSON.stringify({ message: "Invaild token" }), { status: 401 });
  }
  if (action === "updateOwner") {
    const { petId, newOwner } = body;
    try {
      const data = await updateOwner(petId, newOwner);
      return new Response(JSON.stringify(data), { status: 200 });
    } catch (error) {
      console.log("updateOwner error:", error);
      return new Response(JSON.stringify({ message: "Update owner failed" }), { status: 400 });
    }
  }
  return new Response(JSON.stringify({}), { status: 200 });
}
