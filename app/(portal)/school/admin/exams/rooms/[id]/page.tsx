import { RoomSeatingClient } from "@/components/academics/examinations/room-seating-client";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RoomSeatingClient hallId={id} />;
}
