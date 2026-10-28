import { redirect } from "next/navigation";

export default async function LegacyRoomSeatingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/school/admin/exams/rooms/${id}`);
}
