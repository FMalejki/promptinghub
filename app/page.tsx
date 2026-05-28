import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  redirect((await getServerSession(authOptions)) ? "/browse" : "/login");
}
