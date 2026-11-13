export function setupInfiniteScroll({ container, sentinel, fetchMore, hasMore, getLoading, setLoading }) {
    if (!sentinel) return;

    const observer = new IntersectionObserver(
        async (entries) => {
            const entry = entries[0];
            if (entry.isIntersecting && hasMore() && !getLoading()) {
                setLoading(true);
                try {
                    await fetchMore();
                } finally {
                    setLoading(false);
                }
            }
        },
        { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return observer;
}
