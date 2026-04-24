import { createAdminClient } from "@/lib/supabase/admin";

type AuthUserRef = {
  id: string;
};

export async function findAuthUserByEmail(
  email: string,
): Promise<AuthUserRef | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("find_auth_user_id_by_email", {
    p_email: email,
  });

  if (error) {
    throw new Error(`Failed to look up auth user: ${error.message}`);
  }

  return data ? { id: data } : null;
}

export async function findOrCreateAuthUser(params: {
  email: string;
  fullName: string;
}): Promise<AuthUserRef> {
  const existing = await findAuthUserByEmail(params.email);

  if (existing) {
    return existing;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: params.email,
    email_confirm: true,
    user_metadata: {
      full_name: params.fullName,
      source: "torqi-client-portal",
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message || "Failed to create auth user.");
  }

  return { id: data.user.id };
}
