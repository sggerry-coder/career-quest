export default async function Session({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1 className="text-2xl font-bold">Session {id}</h1>
      <p className="text-gray-600 mt-2">Quest session {id}</p>
    </div>
  );
}
