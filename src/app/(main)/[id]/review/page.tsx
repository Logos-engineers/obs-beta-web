import { redirect } from "next/navigation";

export default async function ReviewRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/review/intro?id=${id}`);
}
