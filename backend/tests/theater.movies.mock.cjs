// Stands in for both film sources so browser checks never depend on a live catalog.
// fixtures/hls is a synthetic 60 second test pattern made with ffmpeg's testsrc2.
const path = require("node:path");
const films = {
  "phim-mot": ["Phim Một", "Hành động", 2],
  "phim-hai": ["Phim Hai", "Tình cảm", 1],
  "nguoi-lon": ["Phim Người Lớn", "Phim 18+", 1],
  "truyen-dai": ["Truyện Dài", "Tâm lý", 40],
};
const category = (genre) => [{ name: genre }];
const card = (slug) => ({
  slug,
  name: films[slug][0],
  origin_name: `${films[slug][0]} (gốc)`,
  year: 2026,
  // One film as the real source sends it: a path on the image host.
  poster_url: slug === "phim-hai" ? `uploads/${slug}.webp` : `https://img.example.test/${slug}.jpg`,
  episode_current: `Tập ${films[slug][2]}`,
  category: category(films[slug][1]),
  quality: "FHD",
  lang: "Vietsub + Thuyết Minh",
  tmdb: { vote_average: 8.46, vote_count: 100 },
});
const primaryFilm = (slug) => ({
  status: true,
  movie: {
    ...card(slug),
    content: `<p>Mô tả của ${films[slug][0]}.</p>`,
    time: "60 phút",
    country: [{ name: "Nhật Bản" }],
    director: ["Đạo Diễn A"],
    actor: ["Diễn Viên B"],
    trailer_url: "https://www.youtube.com/watch?v=abc",
  },
  episodes: [
    {
      server_name: "Vietsub",
      server_data: Array.from({ length: films[slug][2] }, (_, i) => ({
        name: `Tập ${String(i + 1).padStart(2, "0")}`,
        slug: `tap-${String(i + 1).padStart(2, "0")}`,
        link_m3u8: `https://stream.example.test/${slug}/tap-${i + 1}/index.m3u8`,
        link_embed: `https://embed.example.test/phimapi/${slug}/tap-${i + 1}`,
      })),
    },
  ],
});
const backupFilm = (slug) => {
  const [name, genre, episodes] = films[slug];
  return {
    status: "success",
    movie: {
      slug,
      name,
      original_name: `${name} (gốc)`,
      year: 2026,
      thumb_url: `https://img.example.test/${slug}.jpg`,
      current_episode: `Tập ${episodes}`,
      description: `<p>Mô tả của ${name}.</p>`,
      category: { 1: { group: { name: "Thể loại" }, list: category(genre) } },
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
    },
  };
};
const byGenre = { "hanh-dong": "phim-mot", "tinh-cam": "phim-hai" };
const matching = (keyword) =>
  Object.keys(films).filter((id) => !keyword || films[id][0].toLowerCase().includes(keyword.toLowerCase()));

exports.mockMovies = async (context) => {
  const state = { primaryDown: false, streamDown: false, optimizerDown: false, primaryRequests: 0, primaryUrls: [] };
  await context.route("https://phimapi.com/**", (route) => {
    state.primaryRequests++;
    if (state.primaryDown) return route.abort("connectionfailed");
    const { pathname, searchParams } = new URL(route.request().url());
    const slug = pathname.match(/^\/phim\/(.+)$/)?.[1];
    if (slug) return route.fulfill({ json: primaryFilm(slug) });
    state.primaryUrls.push(route.request().url());
    const genre = searchParams.get("category");
    const items = (genre ? [byGenre[genre]].filter(Boolean) : matching(searchParams.get("keyword"))).map(card);
    const pagination = { currentPage: 1, totalPages: 1 };
    return route.fulfill({
      json: pathname.startsWith("/v1/")
        ? { status: "success", data: { items, params: { pagination } } }
        : { status: true, items, pagination },
    });
  });
  await context.route("https://phim.nguonc.com/api/**", (route) => {
    const { pathname, searchParams } = new URL(route.request().url());
    const slug = pathname.match(/\/film\/(.+)$/)?.[1];
    return route.fulfill({
      json: slug
        ? backupFilm(slug)
        : {
            status: "success",
            items: matching(searchParams.get("keyword")).map((id) => ({ slug: id, name: films[id][0] })),
            paginate: { current_page: 1, total_page: 1 },
          },
    });
  });
  await context.route("https://stream.example.test/**", (route) => {
    if (state.streamDown) return route.abort("connectionfailed");
    const file = new URL(route.request().url()).pathname.split("/").pop();
    return route.fulfill({
      path: path.join(__dirname, "fixtures/hls", file),
      headers: { "access-control-allow-origin": "*" },
      contentType: file.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp2t",
    });
  });
  const picture = {
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#334"/></svg>',
  };
  await context.route("https://phimimg.com/**", (route) => route.fulfill(picture));
  await context.route("**/_next/image?**", (route) =>
    state.optimizerDown ? route.fulfill({ status: 402, body: "" }) : route.fulfill(picture),
  );
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
  return state;
};
