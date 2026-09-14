export interface CategorySuggestionResponse {
  category: string;
  tags: string[];
  reasoning?: string;
}

/**
 * Calls the server-side Gemini API endpoint to analyze task title & description
 * and automatically suggest the best category and tags.
 */
export async function suggestCategoryWithGemini(
  title: string,
  description: string = '',
  existingCategories: string[] = []
): Promise<CategorySuggestionResponse> {
  if (!title.trim()) {
    throw new Error('Please enter a task title first.');
  }

  const response = await fetch('/api/gemini/suggest-category', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title.trim(),
      description: description.trim(),
      existingCategories,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errData.error || `Server responded with status ${response.status}`);
  }

  const data: CategorySuggestionResponse = await response.json();
  return data;
}
