import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import CollectionGrid from "./collection-grid";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <CollectionGrid userName={session.user.name || "DJ"} />;
}
