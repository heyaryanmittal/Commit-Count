/**
 * Netlify Function: GitHub GraphQL Proxy
 * 
 * Securely handles GitHub API requests using a protected GITHUB_TOKEN.
 * Recognizes either GITHUB_TOKEN or VITE_GITHUB_TOKEN from environment.
 */

export const handler = async (event) => {
  // Support both key styles for compatibility
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN;

  if (!GITHUB_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "No GitHub token found in Netlify Environment Variables." }),
    };
  }

  if (event.httpMethod !== "POST" && event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const isGraphQL = event.path.includes("graphql");
    const targetUrl = isGraphQL 
      ? "https://api.github.com/graphql" 
      : "https://api.github.com" + event.path.replace("/.netlify/functions/github-proxy", "");

    const fetchOptions = {
      method: event.httpMethod,
      headers: {
        "Authorization": `bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        "Accept": "application/vnd.github.v3+json",
      },
    };

    if (event.httpMethod === "POST") {
      fetchOptions.body = event.body;
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json();

    return {
      statusCode: response.status,
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    };
  } catch (error) {
    console.error("Proxy Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch from GitHub API" }),
    };
  }
};
