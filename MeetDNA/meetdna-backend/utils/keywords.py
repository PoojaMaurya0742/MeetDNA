import re
from collections import Counter

STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "must", "shall", "can", "need",
    "dare", "ought", "used", "it", "its", "this", "that", "these", "those",
    "i", "you", "he", "she", "we", "they", "what", "which", "who", "whom",
    "when", "where", "why", "how", "all", "each", "every", "both", "few",
    "more", "most", "other", "some", "such", "no", "nor", "not", "only",
    "own", "same", "so", "than", "too", "very", "just", "about", "into",
    "through", "during", "before", "after", "above", "below", "up", "down",
    "out", "off", "over", "under", "again", "further", "then", "once", "here",
    "there", "any", "as", "if", "because", "until", "while", "also", "our",
    "your", "their", "my", "his", "her", "me", "him", "them", "us", "am",
    "like", "get", "got", "going", "go", "know", "think", "say", "said",
    "well", "yeah", "yes", "no", "okay", "ok", "um", "uh", "right", "let",
}


def extract_keywords(text: str, top_n: int = 10) -> list[str]:
    words = re.findall(r"[a-zA-Z]{3,}", text.lower())
    filtered = [w for w in words if w not in STOP_WORDS]
    if not filtered:
        return []
    counts = Counter(filtered)
    return [word for word, _ in counts.most_common(top_n)]


def cluster_keywords(keywords: list[str], cluster_size: int = 3) -> list[str]:
    if not keywords:
        return []
    clusters: list[str] = []
    for i in range(0, len(keywords), cluster_size):
        cluster = keywords[i : i + cluster_size]
        clusters.append(" ".join(cluster))
    return clusters
