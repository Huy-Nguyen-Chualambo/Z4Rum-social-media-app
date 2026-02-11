export const MOVIE_API_CONFIG = {
    BASE_URL: process.env.NEXT_PUBLIC_MOVIE_API_URL || "",
    IMAGE_BASE_URL: process.env.NEXT_PUBLIC_MOVIE_IMAGE_URL || "",
};

export const movieApi = {
    getNewUpdates: async (page = 1) => {
        const res = await fetch(`${MOVIE_API_CONFIG.BASE_URL}/danh-sach/phim-moi-cap-nhat-v3?page=${page}`);
        return res.json();
    },

    getMovieDetail: async (slug: string) => {
        const res = await fetch(`${MOVIE_API_CONFIG.BASE_URL}/phim/${slug}`);
        return res.json();
    },

    getListByType: async (type: string, page = 1) => {
        const res = await fetch(`${MOVIE_API_CONFIG.BASE_URL}/v1/api/danh-sach/${type}?page=${page}`);
        return res.json();
    },

    search: async (keyword: string, page = 1) => {
        const res = await fetch(`${MOVIE_API_CONFIG.BASE_URL}/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`);
        return res.json();
    },

    getCategories: async () => {
        const res = await fetch(`${MOVIE_API_CONFIG.BASE_URL}/the-loai`);
        return res.json();
    },

    getCountries: async () => {
        const res = await fetch(`${MOVIE_API_CONFIG.BASE_URL}/quoc-gia`);
        return res.json();
    },
};
