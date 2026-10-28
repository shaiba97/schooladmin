import { redirect } from "next/navigation";

export default function LegacyRoomsPage() {
  redirect("/school/admin/exams/rooms");
}
