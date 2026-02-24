function asRecord(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return {};
    }
    return value;
}
function asString(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}
function asNumber(value) {
    if (value === null || value === undefined) {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}
function withoutLargeTextFields(metadata) {
    const blockedKeys = new Set([
        'text',
        'content',
        'chunk',
        'chunk_text',
        'page_content',
        'excerpt',
        'body'
    ]);
    const cleaned = {};
    for (const [key, value] of Object.entries(metadata)) {
        if (blockedKeys.has(key)) {
            continue;
        }
        if (typeof value === 'string' && value.length > 300) {
            continue;
        }
        cleaned[key] = value;
    }
    return cleaned;
}
function extractPoints(payload) {
    if (Array.isArray(payload.result)) {
        return payload.result.map((point) => asRecord(point));
    }
    const result = asRecord(payload.result);
    if (Array.isArray(result.points)) {
        return result.points.map((point) => asRecord(point));
    }
    return [];
}
function mapPoint(point) {
    const rawPayload = asRecord(point.payload);
    const metadata = asRecord(rawPayload.metadata);
    const mergedMetadata = withoutLargeTextFields({
        ...metadata
    });
    if (!('book_title' in mergedMetadata) && rawPayload.book_title !== undefined) {
        mergedMetadata.book_title = rawPayload.book_title;
    }
    if (!('year' in mergedMetadata) && rawPayload.year !== undefined) {
        mergedMetadata.year = rawPayload.year;
    }
    if (!('specialty' in mergedMetadata) && rawPayload.specialty !== undefined) {
        mergedMetadata.specialty = rawPayload.specialty;
    }
    const sourceId = asString(rawPayload.chunk_id) ??
        asString(rawPayload.source_id) ??
        asString(rawPayload.chunkId) ??
        asString(point.id);
    if (!sourceId) {
        return null;
    }
    const title = asString(rawPayload.title) ??
        asString(rawPayload.document_title) ??
        asString(rawPayload.book_title);
    return {
        sourceId,
        score: asNumber(point.score),
        title,
        metadata: mergedMetadata,
        excerpt: null
    };
}
export function createProtocolReferencesQdrantAdapter(input) {
    const baseUrl = input.baseUrl.replace(/\/+$/, '');
    const collectionName = input.collectionName;
    const timeoutMs = input.timeoutMs ?? 7000;
    return {
        async suggest(params) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const endpoint = `${baseUrl}/collections/${encodeURIComponent(collectionName)}/points/query`;
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        ...(input.apiKey ? { 'api-key': input.apiKey } : {})
                    },
                    body: JSON.stringify({
                        query: params.q,
                        limit: params.limit,
                        with_payload: true,
                        with_vector: false
                    }),
                    signal: controller.signal
                });
                if (!response.ok) {
                    throw new Error(`Qdrant query failed (${response.status} ${response.statusText})`);
                }
                const data = (await response.json());
                const points = extractPoints(data);
                const hits = [];
                for (const point of points) {
                    const mapped = mapPoint(point);
                    if (!mapped) {
                        continue;
                    }
                    hits.push(mapped);
                }
                return hits;
            }
            finally {
                clearTimeout(timeoutId);
            }
        }
    };
}
//# sourceMappingURL=qdrant.js.map