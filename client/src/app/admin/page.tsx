import { redirect } from "next/navigation";

/** Orders are what an admin opens this panel for; products are the other tab. */
export default function AdminHome() {
  redirect("/admin/orders");
}
