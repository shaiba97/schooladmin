import { RoomsClient } from "@/components/academics/examinations/rooms-client";
import { listClasses } from "@/lib/api/classes";
import { listHalls } from "@/lib/api/halls";
import type { ApiHall, ApiSchoolClass } from "@/lib/api/types";
import { academicErrorMessage } from "@/lib/format";

export default async function Page() {
  const [hallsResult, classesResult] = await Promise.allSettled([
    listHalls(),
    listClasses({ page: 1, limit: 999 }),
  ]);

  const halls: ApiHall[] = hallsResult.status === "fulfilled" ? hallsResult.value : [];
  const classes: ApiSchoolClass[] =
    classesResult.status === "fulfilled" ? classesResult.value.data : [];

  const messages: string[] = [];
  if (hallsResult.status === "rejected") {
    messages.push(academicErrorMessage(hallsResult.reason, "Unable to load rooms"));
  }
  if (classesResult.status === "rejected") {
    messages.push(academicErrorMessage(classesResult.reason, "Unable to load classes"));
  }

  return <RoomsClient initialRooms={halls} initialClasses={classes} loadError={messages.join(" ")} />;
}
