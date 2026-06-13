"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseAmount } from "@/lib/format";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// Verifica que el viaje sea del usuario antes de tocar sus hijos.
async function ownsTrip(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tripId: string
) {
  const { data } = await supabase
    .from("trips")
    .select("id")
    .eq("id", tripId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function createTrip(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const currency = String(formData.get("currency") ?? "MXN").trim().toUpperCase() || "MXN";
  const peopleRaw = String(formData.get("people") ?? "");
  const names = peopleRaw
    .split(/[\n,]/)
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 30);

  const shareToken = randomBytes(9).toString("base64url");

  const { data: trip, error } = await supabase
    .from("trips")
    .insert({ user_id: user.id, name, currency, share_token: shareToken })
    .select("id")
    .single();
  if (error || !trip) return;

  if (names.length > 0) {
    await supabase
      .from("trip_people")
      .insert(names.map((n) => ({ trip_id: trip.id, name: n })));
  }

  revalidatePath("/viajes");
  redirect(`/viajes/${trip.id}`);
}

export async function addPerson(formData: FormData) {
  const { supabase, user } = await requireUser();
  const tripId = String(formData.get("trip_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name || !(await ownsTrip(supabase, user.id, tripId))) return;
  await supabase.from("trip_people").insert({ trip_id: tripId, name });
  revalidatePath(`/viajes/${tripId}`);
}

export async function deletePerson(formData: FormData) {
  const { supabase, user } = await requireUser();
  const tripId = String(formData.get("trip_id") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!id || !(await ownsTrip(supabase, user.id, tripId))) return;
  await supabase.from("trip_people").delete().eq("id", id).eq("trip_id", tripId);
  revalidatePath(`/viajes/${tripId}`);
}

export async function addContribution(formData: FormData) {
  const { supabase, user } = await requireUser();
  const tripId = String(formData.get("trip_id") ?? "");
  const personId = String(formData.get("person_id") ?? "") || null;
  const amount = parseAmount(formData.get("amount"));
  if (amount === null || !(await ownsTrip(supabase, user.id, tripId))) return;
  await supabase
    .from("trip_contributions")
    .insert({ trip_id: tripId, person_id: personId, amount });
  revalidatePath(`/viajes/${tripId}`);
}

export async function deleteContribution(formData: FormData) {
  const { supabase, user } = await requireUser();
  const tripId = String(formData.get("trip_id") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!id || !(await ownsTrip(supabase, user.id, tripId))) return;
  await supabase.from("trip_contributions").delete().eq("id", id).eq("trip_id", tripId);
  revalidatePath(`/viajes/${tripId}`);
}

export async function addTripExpense(formData: FormData) {
  const { supabase, user } = await requireUser();
  const tripId = String(formData.get("trip_id") ?? "");
  const concept = String(formData.get("concept") ?? "").trim() || null;
  const amount = parseAmount(formData.get("amount"));
  if (amount === null || !(await ownsTrip(supabase, user.id, tripId))) return;
  await supabase.from("trip_expenses").insert({ trip_id: tripId, concept, amount });
  revalidatePath(`/viajes/${tripId}`);
}

export async function deleteTripExpense(formData: FormData) {
  const { supabase, user } = await requireUser();
  const tripId = String(formData.get("trip_id") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!id || !(await ownsTrip(supabase, user.id, tripId))) return;
  await supabase.from("trip_expenses").delete().eq("id", id).eq("trip_id", tripId);
  revalidatePath(`/viajes/${tripId}`);
}

export async function setTripStatus(formData: FormData) {
  const { supabase, user } = await requireUser();
  const tripId = String(formData.get("trip_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["activo", "cerrado"].includes(status) || !(await ownsTrip(supabase, user.id, tripId))) return;
  await supabase.from("trips").update({ status }).eq("id", tripId).eq("user_id", user.id);
  revalidatePath(`/viajes/${tripId}`);
}

export async function deleteTrip(formData: FormData) {
  const { supabase, user } = await requireUser();
  const tripId = String(formData.get("trip_id") ?? "");
  if (tripId) {
    await supabase.from("trips").delete().eq("id", tripId).eq("user_id", user.id);
  }
  revalidatePath("/viajes");
  redirect("/viajes");
}
