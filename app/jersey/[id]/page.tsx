import JerseyDetail from "@/app/pages/JerseyDetail";

export default async function Page({ params }: PageProps<"/jersey/[id]">) {
  const { id } = await params;

  return <JerseyDetail id={id} />;
}
