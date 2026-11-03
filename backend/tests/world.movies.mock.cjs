// Stands in for phim.nguonc.com so browser checks never depend on the live catalog.
const films = {
  "phim-mot": ["Phim Một", "Hành động", 2],
  "phim-hai": ["Phim Hai", "Tình cảm", 1],
  "nguoi-lon": ["Phim Người Lớn", "Phim 18+", 1],
};
const film = (slug) => {
  const [name, genre, episodes] = films[slug];
  return {
    slug,
    name,
    original_name: `${name} (gốc)`,
    year: 2026,
    thumb_url: `https://img.example.test/${slug}.jpg`,
    current_episode: episodes > 1 ? `Tập ${episodes}` : "FULL",
    description: `<p>Mô tả của ${name}.</p>`,
    category: { 1: { group: { name: "Thể loại" }, list: [{ name: genre }] } },
    episodes: [
      {
        server_name: "Vietsub #1",
        items: Array.from({ length: episodes }, (_, i) => ({
          name: String(i + 1),
          slug: `tap-${i + 1}`,
          embed: `https://embed.example.test/${slug}/tap-${i + 1}`,
        })),
      },
    ],
  };
};
exports.mockMovies = async (context) => {
  await context.route("https://phim.nguonc.com/api/**", (route) => {
    const { pathname, searchParams } = new URL(route.request().url());
    const slug = pathname.match(/\/film\/(.+)$/)?.[1];
    const matches = pathname.endsWith("/search")
      ? Object.keys(films).filter((id) =>
          films[id][0].toLowerCase().includes(searchParams.get("keyword").toLowerCase()),
        )
      : Object.keys(films);
    return route.fulfill({
      json: slug
        ? { status: "success", movie: film(slug) }
        : {
            status: "success",
            items: matches.map((id) => ({ slug: id, name: films[id][0] })),
            paginate: { current_page: 1, total_page: 1 },
          },
    });
  });
  await context.route("https://img.example.test/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#334"/></svg>',
    }),
  );
  await context.route("https://embed.example.test/**", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: "<!doctype html><body style='background:#000;color:#fff'>Trình phát thử</body>",
    }),
  );
};
