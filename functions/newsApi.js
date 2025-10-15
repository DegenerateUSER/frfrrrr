import axios from 'axios';

async function searchTopNews(topic, apiKey) {
  const url = `https://api.worldnewsapi.com/search-news?text=${encodeURIComponent(topic)}&language=en&number=5&sort=publish-time&sort-direction=DESC&api-key=${apiKey}`;
  
  try {
    console.log(`🔍 Searching news for: ${topic}`);
    const response = await axios.get(url);
    const data = response.data;
    
    if (data.news && data.news.length > 0) {
      let newsText = `📰 Top News on "${topic}":\n\n`;
      
      data.news.forEach((article, i) => {
        newsText += `${i + 1}. *${article.title}*\n`;
        newsText += `   📅 ${article.publish_date || 'N/A'}\n`;
        newsText += `   🔗 ${article.url}\n`;
        if (article.text) {
          const summary = article.text.substring(0, 100) + '...';
          newsText += `   📝 ${summary}\n`;
        }
        newsText += `\n`;
      });
      
      return newsText;
    } else {
      return `❌ No news found for "${topic}". Try a different topic.`;
    }
  } catch (error) {
    console.error("Error fetching news:", error);
    return `❌ Error fetching news: ${error.message}`;
  }
}

export { searchTopNews };
