import { redirect } from "next/navigation";

/** The school admin workspace lives at /admin/profile; this is the short path. */
export default function SchoolAdminPage() {
  redirect("/admin/profile");
}
