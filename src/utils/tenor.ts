export const getGifUrl = async (
  searchTerm: string = "milk"
): Promise<string> => {
  try {
    const response: { results: { url: string }[] } = await fetch(
      `https://g.tenor.com/v1/random?q=${searchTerm}&key=${process.env.TENOR_API_KEY}&limit=1`
    ).then((res) => res.json());

    if (response.results?.length > 0) {
      return response.results[0].url;
    }
  } catch (e) {
    console.error(e);
  }

  return "https://c.tenor.com/th8Qrx-ZMVUAAAAC/milk-milj.gif";
};
