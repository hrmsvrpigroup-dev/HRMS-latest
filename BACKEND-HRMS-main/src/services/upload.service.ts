export const uploadService = {
  async uploadPlaceholder(fileName: string) {
    return {
      url: `https://example.com/uploads/${encodeURIComponent(fileName)}`,
    }
  },
}

