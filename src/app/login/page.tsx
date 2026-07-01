import { LockScreen } from "@/components/auth/lock-screen";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300;

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: allowedEmails } = await supabase
    .from("allowed_emails")
    .select("email, name, role, can_assign_tasks")
    .order("email");

  return <LockScreen allowedEmails={allowedEmails ?? []} />;
}
