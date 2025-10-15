import axios from "axios";

export async function scanUrl(url) {
    try {
      const encodedUrl = encodeURIComponent(url);
      const { data } = await axios.get(
        `https://ipqualityscore.com/api/json/url/siJ8Ny9prnE6r2YY3lYO3v69mhJOsKuE/${encodedUrl}`
      );
      return data;
    } catch (error) {
      console.error("Failed to scan URL:", error);
      return null;
    }
  }

export function extractUrl(text) {
    // Simple regex to find URLs in text
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    return urls ? urls[0] : null;
  }