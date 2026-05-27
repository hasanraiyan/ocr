export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

/**
 * Initiates file processing by uploading a PDF or Image.
 * @param {File} file - PDF or Image file
 * @returns {Promise<object>} DocumentCreateResponse
 */
export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/documents/process`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to process document");
  }

  return response.json();
}

/**
 * Retrieves the status and structured results of a specific document job.
 * @param {string} docId - Job UUID
 * @returns {Promise<object>} DocumentResponse
 */
export async function getDocumentResult(docId) {
  const response = await fetch(`${API_BASE_URL}/documents/${docId}/result`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to fetch document status");
  }

  return response.json();
}

/**
 * Lists all historically processed documents.
 * @returns {Promise<Array>} List of DocumentResponses
 */
export async function listDocuments() {
  const response = await fetch(`${API_BASE_URL}/documents/`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to retrieve historical items");
  }

  return response.json();
}
