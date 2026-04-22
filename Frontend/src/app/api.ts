const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiPost(path: string, body: any) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errorData = null;
    try {
      errorData = await res.json();
    } catch (e) {}
    
    if (res.status === 401) {
      console.error("Unauthorized");
    }
    
    // Create an Axios-like error object so err.response?.data?.detail works across the app
    const err = new Error(errorData?.detail || "API Error");
    (err as any).response = { data: errorData };
    throw err;
  }

  return res.json();
}

export async function apiGet(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      ...getAuthHeaders(),
    },
  });
  if (!res.ok) {
    throw new Error("API Error");
  }
  return res.json();
}

export async function apiPostFile(path: string, file: File, extraData?: Record<string, string>) {
  const formData = new FormData();
  formData.append("file", file);
  if (extraData) {
    Object.keys(extraData).forEach(key => formData.append(key, extraData[key]));
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });

  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function apiPut(url: string, body: any) {
  const res = await fetch(`${BASE_URL}${url}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errorData = null;
    try {
      errorData = await res.json();
    } catch (e) {}

    const err = new Error(errorData?.detail || "API PUT failed");
    (err as any).response = { data: errorData };
    throw err;
  }

  return res.json();
}
export async function apiDelete(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) throw new Error("API Error");
  return res.json();
}
export const apiGet1 = (url: string) =>
  fetch(url, { headers: getAuthHeaders() }).then(res => res.json());

export const apiPost1 = (url: string, body?: any) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  }).then(res => res.json());

export const getAlerts = () => apiGet("/alerts");
export const markAlertSeen = (id: number) =>
  apiPost(`/alerts/${id}/seen`, {});

export async function apiDownload(path: string, filename: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    credentials: "include",
    headers: {
      ...getAuthHeaders(),
    }
  });

  if (!res.ok) throw new Error("Download failed");

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

