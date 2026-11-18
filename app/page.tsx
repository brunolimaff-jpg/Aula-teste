export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (typeof val === 'string') {
      qs.set(key, val);
    } else if (Array.isArray(val) && val[0]) {
      qs.set(key, val[0]);
    }
  }
  if (!qs.has('v')) qs.set('v', '855');
  const query = qs.toString();
  const src = `/um-dia-de-safra.html?${query}`;

  return (
    <main className="w-screen h-screen overflow-hidden bg-[#061214]">
      <iframe
        src={src}
        title="Um Dia de Safra — Usina Horizonte"
        className="block w-full h-full border-0"
        allow="autoplay"
      />
    </main>
  );
}
