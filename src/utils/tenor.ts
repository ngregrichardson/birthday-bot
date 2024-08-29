type TenorResponse = {
	results: {
		media_formats: {
			gif: {
				url: string;
			};
		};
	}[];
};

export const getGifUrl = async (searchTerm: string): Promise<string> => {
	try {
		const response = (await fetch(
			`https://tenor.googleapis.com/v2/search?key=${
				process.env.TENOR_API_KEY
			}&q=${encodeURIComponent(searchTerm)}&random=true&limit=1`,
		).then((res) => res.json())) as TenorResponse;

		if (response.results) {
			const gif = response.results.at(0);

			if (gif) {
				return gif.media_formats.gif.url;
			}
		}
	} catch (e) {
		console.error(e);
	}

	return "https://c.tenor.com/Pfkxj6MmpL0AAAAC/tenor.gif";
};
