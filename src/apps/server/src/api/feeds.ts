import Parser from 'rss-parser';
import { Article } from 'core';

const parser = new Parser();

export async function fetchFeeds(source: 'yahoo' | 'bloomberg'): Promise<Article[]> {
    let feedUrl = '';

    if (source === 'yahoo') {
        feedUrl = 'https://news.yahoo.com/rss';
    } else if (source === 'bloomberg') {
        // Bloomberg doesn't have a reliable simple public RSS for everything, using highly available feed
        feedUrl = 'https://feeds.bloomberg.com/crypto/news.rss';
    }

    try {
        const feed = await parser.parseURL(feedUrl);

        return feed.items.map((item, index) => ({
            id: `${source}-${index}`,
            title: item.title || 'No Title',
            link: item.link || '',
            snippet: item.contentSnippet || item.content || 'No description available',
            pubDate: item.pubDate || new Date().toISOString(),
            source: source
        }));
    } catch (error) {
        console.error(`Error fetching feed from ${source}:`, error);
        return [];
    }
}
