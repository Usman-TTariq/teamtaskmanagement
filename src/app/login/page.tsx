import { LockScreen } from "@/components/auth/lock-screen";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: allowedEmails } = await supabase
    .from("allowed_emails")
    .select("email, name, role")
    .order("email");

  return (
    <LockScreen
      allowedEmails={allowedEmails ?? []}
      demoAuthEnabled={process.env.DEMO_AUTH_ENABLED === "true"}
    />
  );
}
