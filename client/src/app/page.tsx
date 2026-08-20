import { redirect } from "next/navigation";

/** There is no marketing home page in this build — the catalogue is the front door. */
export default function Home() {
  redirect("/products");
}
