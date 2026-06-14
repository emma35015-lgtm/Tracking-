"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseAmount } from "@/lib/format";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// El usuario es DUEÑO del viaje (puede cerrarlo, borrarlo, moderar todo).
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

// El usuario PUEDE ENTRAR al viaje (dueño o miembro invitado).
// RLS solo deja leer el viaje si eres dueño o miembro, así que basta con verlo.
async function canAccessTrip(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tripId: string
) {
  const { data } = await supabase.from("trips").select("id").eq("id", tripId).maybeSingle();
  return Boolean(data);
}

// Nombre para mostrar: perfil → parte local del correo → "Miembro".
function friendlyName(displayName?: string | null, email?: string | null): string {
  const fromProfile = (displayName ?? "").trim();
  if (fromProfile) return fromProfile;
  const local = (email ?? "").split("@")[0]?.trim();
  return local || "Miembro";
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

  // El dueño también es miembro (para que aparezca en "quién agregó" y en la lista).
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const ownerName = friendlyName(profile?.display_name, user.email);
  await supabase.from("trip_members").insert({
    trip_id: trip.id,
    user_id: user.id,
    role: "owner",
    display_name: profile?.display_name ?? null,
  });

  // El dueño aparece como persona (ligada a su cuenta) para registrar aportaciones.
  await supabase
    .from("trip_people")
    .insert({ trip_id: trip.id, name: ownerName, user_id: user.id });

  if (names.length > 0) {
    await supabase
      .from("trip_people")
      .insert(names.map((n) => ({ trip_id: trip.id, name: n })));
  }

  revalidatePath("/viajes");
  redirect(`/viajes/${trip.id}`);
}

// Unirse a un viaje con el link compartido. El token es la invitación:
// se resuelve con la service-role key (un no-miembro no puede leer el viaje por RLS).
export async function joinTrip(formData: FormData) {
  const { user } = await requireUser();
  const token = String(formData.get("token") ?? "").trim();
  if (!token) return;

  const admin = createAdminClient();
  const { data: trip } = await admin
    .from("trips")
    .select("id, user_id")
    .eq("share_token", token)
    .maybeSingle();
  if (!trip) return;

  // El dueño ya pertenece; solo agregamos a invitados.
  if (trip.user_id !== user.id) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    await admin
      .from("trip_members")
      .upsert(
        {
          trip_id: trip.id,
          user_id: user.id,
          role: "member",
          display_name: profile?.display_name ?? null,
        },
        { onConflict: "trip_id,user_id", ignoreDuplicates: true }
      );

    // Aparece como persona ligada a su cuenta para poder registrar aportaciones.
    const { data: existingPerson } = await admin
      .from("trip_people")
      .select("id")
      .eq("trip_id", trip.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existingPerson) {
      await admin.from("trip_people").insert({
        trip_id: trip.id,
        name: friendlyName(profile?.display_name, user.email),
        user_id: user.id,
      });
    }
  }

  revalidatePath("/viajes");
  redirect(`/viajes/${trip.id}`);
}

// Un miembro (no el dueño) sale del viaje.
export async function leaveTrip(formData: FormData) {
  const { supabase, user } = await requireUser();
  const tripId = String(formData.get("trip_id") ?? "");
  if (!tripId) return;
  await supabase
    .from("trip_members")
    .delete()
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .neq("role", "owner");
  revalidatePath("/viajes");
  redirect("/viajes");
}

export async function addPerson(formData: FormData) {
  const { supabase } = await requireUser();
  const tripId = String(formData.get("trip_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name || !(await canAccessTrip(supabase, tripId))) return;
  await supabase.from("trip_people").insert({ trip_id: tripId, name });
  revalidatePath(`/viajes/${tripId}`);
}

export async function deletePerson(formData: FormData) {
  const { supabase } = await requireUser();
  const tripId = String(formData.get("trip_id") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!id || !(await canAccessTrip(supabase, tripId))) return;
  await supabase.from("trip_people").delete().eq("id", id).eq("trip_id", tripId);
  revalidatePath(`/viajes/${tripId}`);
}

export async function addContribution(formData: FormData) {
  const { supabase, user } = await requireUser();
  const tripId = String(formData.get("trip_id") ?? "");
  const personId = String(formData.get("person_id") ?? "") || null;
  const amount = parseAmount(formData.get("amount"));
  if (amount === null || !(await canAccessTrip(supabase, tripId))) return;
  await supabase
    .from("trip_contributions")
    .insert({ trip_id: tripId, person_id: personId, amount, added_by: user.id });
  revalidatePath(`/viajes/${tripId}`);
}

export async function deleteContribution(formData: FormData) {
  const { supabase } = await requireUser();
  const tripId = String(formData.get("trip_id") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!id || !(await canAccessTrip(supabase, tripId))) return;
  // RLS asegura que solo borres lo tuyo (o el dueño, lo que sea).
  await supabase.from("trip_contributions").delete().eq("id", id).eq("trip_id", tripId);
  revalidatePath(`/viajes/${tripId}`);
}

export async function addTripExpense(formData: FormData) {
  const { supabase, user } = await requireUser();
  const tripId = String(formData.get("trip_id") ?? "");
  const concept = String(formData.get("concept") ?? "").trim() || null;
  const amount = parseAmount(formData.get("amount"));
  if (amount === null || !(await canAccessTrip(supabase, tripId))) return;
  await supabase
    .from("trip_expenses")
    .insert({ trip_id: tripId, concept, amount, added_by: user.id });
  revalidatePath(`/viajes/${tripId}`);
}

export async function deleteTripExpense(formData: FormData) {
  const { supabase } = await requireUser();
  const tripId = String(formData.get("trip_id") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!id || !(await canAccessTrip(supabase, tripId))) return;
  // RLS asegura que solo borres lo tuyo (o el dueño).
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
