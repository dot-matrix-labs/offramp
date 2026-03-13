export interface Article {
    id: string;
    title: string;
    link: string;
    snippet: string;
    pubDate: string;
    source: 'yahoo' | 'bloomberg';
}

export interface NewsletterDraft {
    synopsis: string;
    articles: Article[];
}
