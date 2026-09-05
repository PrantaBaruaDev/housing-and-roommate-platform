export const parseExecuteTime = (
    dateString?: string | null,
    fallbackDate: Date = new Date()
): Date => {
    if (!dateString || typeof dateString !== "string") {
        return fallbackDate;
    }

    try {
        // Fix bKash milliseconds format ":000 GMT" -> ".000"
        const formatted = dateString
            .replace(/:(\d{3})\sGMT/, ".$1")
            .replace(/\sGMT/, "");

        const parsedDate = new Date(formatted);

        return isNaN(parsedDate.getTime()) ? fallbackDate : parsedDate;
    } catch {
        return fallbackDate;
    }
};