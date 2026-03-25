import { redirect } from "next/navigation";

export default function MyMentorRedirectPage() {
  redirect("/my-program?notice=my-mentor-moved");
}
