export default async function StudentView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1 className="text-2xl font-bold">Student Profile</h1>
      <p className="text-gray-600 mt-2">Viewing student {id}</p>
    </div>
  );
}
