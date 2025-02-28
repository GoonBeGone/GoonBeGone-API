addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// Hardcoded URLs
const BAN_LIST_GITHUB_URL = "https://raw.githubusercontent.com/GoonBeGone/GoonerAvatarList/main/roblox_items.json";
const BANNED_USERS_GITHUB_URL = "https://raw.githubusercontent.com/GoonBeGone/GoonerAvatarList/main/banned_users.json";
const GITHUB_API_URL = "https://api.github.com/repos/GoonBeGone/GoonerAvatarList/contents/banned_users.json";

// Replace with your actual Discord webhook URL
const WEBHOOK_URL = ""; // Add your webhook URL here

// Hardcoded login credentials (replace with your own)
const ADMIN_USERNAME = "example";
const ADMIN_PASSWORD = "example"; // Change this!

/**
 * Main request handler
 */
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  console.log("Routing request:", method, path);

  // Login page
  if (path === '/login' && method === 'GET') {
    return new Response(getLoginPage(), {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Handle login POST
  if (path === '/login' && method === 'POST') {
    return handleLogin(request);
  }

  // Edit keys page (protected)
  if (path === '/edit-keys') {
    return handleEditKeys(request);
  }

  // API endpoints (require authentication)
  const gameId = request.headers.get('X-Game-Id');
  const apiKey = request.headers.get('X-API-Key');

  console.log("Received API request with Game ID:", gameId, "API Key:", apiKey ? "[REDACTED]" : "MISSING");

  if (!gameId || !apiKey) {
    console.log("Missing Game ID or API Key");
    return new Response('Unauthorized: Missing Game ID or API Key', { status: 401 });
  }

  const gameApiKeys = await getGameApiKeysFromKV();
  if (!gameApiKeys || Object.keys(gameApiKeys).length === 0) {
    console.error("No API keys found in KV storage");
    return new Response('Internal Server Error: API Key configuration missing', { status: 500 });
  }

  console.log("Available Game IDs:", Object.keys(gameApiKeys));

  const expectedApiKey = gameApiKeys[gameId];
  if (!expectedApiKey || apiKey !== expectedApiKey) {
    console.log("API Key mismatch or not found for Game ID:", gameId);
    return new Response('Unauthorized: Invalid API Key for this Game', { status: 401 });
  }

  // Route API requests
  if (path === '/check-items' && method === 'POST') {
    return handleCheckItems(request);
  } else if (path === '/ban-user' && method === 'POST') {
    return handleBanUser(request);
  } else if (path === '/fetch-banned-users' && method === 'GET') {
    return fetchBannedUsersEndpoint(request);
  } else {
    console.log("Route not found");
    return new Response('Not Found or Invalid Method', { status: 404 });
  }
}

/**
 * Ping the webhook with ban details
 */
async function pingWebhook(userId, bannedItems) {
  try {
    const payload = {
      username: "GoonerBeGone Notifier",
      content: `User ${userId} was banned for wearing flagged items:\n${bannedItems.map(item => `- ${item}`).join('\n')}`
    };

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Failed to ping webhook: ${response.status} ${response.statusText}`);
    } else {
      console.log(`Webhook pinged successfully for user ${userId}`);
    }
  } catch (error) {
    console.error("Error pinging webhook:", error.message);
  }
}

/**
 * Fetch game API keys from KV storage
 */
async function getGameApiKeysFromKV() {
  try {
    const kvValue = await KV_NAMESPACE.get('gameApiKeys'); // Replace KV_NAMESPACE with your KV binding name
    if (!kvValue) {
      console.error("No gameApiKeys found in KV");
      return {};
    }
    const keys = JSON.parse(kvValue);
    console.log("Fetched gameApiKeys from KV:", Object.keys(keys));
    return keys;
  } catch (error) {
    console.error("Error fetching gameApiKeys from KV:", error.message);
    return {};
  }
}

/**
 * Save game API keys to KV storage
 */
async function saveGameApiKeysToKV(keys) {
  try {
    await KV_NAMESPACE.put('gameApiKeys', JSON.stringify(keys)); // Replace KV_NAMESPACE with your KV binding name
    console.log("Saved gameApiKeys to KV:", Object.keys(keys));
    return true;
  } catch (error) {
    console.error("Error saving gameApiKeys to KV:", error.message);
    return false;
  }
}

/**
 * Login page HTML
 */
function getLoginPage(errorMessage = '') {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Login - Ban Manager</title>
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f0f0; }
          .login-container { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          h1 { text-align: center; color: #333; }
          input { width: 100%; padding: 8px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px; }
          button { width: 100%; padding: 10px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background-color: #0056b3; }
          .error { color: red; text-align: center; }
        </style>
      </head>
      <body>
        <div class="login-container">
          <h1>Login</h1>
          ${errorMessage ? `<p class="error">${errorMessage}</p>` : ''}
          <form method="POST" action="/login">
            <input type="text" name="username" placeholder="Username" required>
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit">Login</button>
          </form>
        </div>
      </body>
    </html>
  `;
}

/**
 * Handle login POST request
 */
async function handleLogin(request) {
  const formData = await request.formData();
  const username = formData.get('username');
  const password = formData.get('password');

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const headers = new Headers();
    headers.set('Set-Cookie', 'session=authenticated; Path=/; HttpOnly');
    headers.set('Location', '/edit-keys');
    return new Response(null, { status: 302, headers });
  } else {
    return new Response(getLoginPage('Invalid username or password'), {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

/**
 * Edit keys page HTML
 */
function getEditKeysPage(keys, message = '') {
  const keyRows = Object.entries(keys).map(([gameId, apiKey], index) => `
    <tr>
      <td><input type="text" name="gameId${index}" value="${gameId}" required></td>
      <td><input type="text" name="apiKey${index}" value="${apiKey}" required></td>
      <td><button type="button" onclick="this.parentElement.parentElement.remove()">Remove</button></td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Edit API Keys - Ban Manager</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; background-color: #f0f0f0; }
          .container { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1); max-width: 800px; margin: auto; }
          h1 { text-align: center; color: #333; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; border: 1px solid #ccc; text-align: left; }
          input { width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 4px; }
          button { padding: 5px 10px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background-color: #0056b3; }
          .message { text-align: center; color: green; }
          .add-btn { display: block; margin: 10px auto; }
        </style>
        <script>
          function addKeyRow() {
            const table = document.getElementById('keysTable').getElementsByTagName('tbody')[0];
            const rowCount = table.rows.length;
            const row = table.insertRow();
            row.innerHTML = \`
              <td><input type="text" name="gameId\${rowCount}" required></td>
              <td><input type="text" name="apiKey\${rowCount}" required></td>
              <td><button type="button" onclick="this.parentElement.parentElement.remove()">Remove</button></td>
            \`;
          }
        </script>
      </head>
      <body>
        <div class="container">
          <h1>Edit API Keys</h1>
          ${message ? `<p class="message">${message}</p>` : ''}
          <form method="POST" action="/edit-keys">
            <table id="keysTable">
              <thead>
                <tr>
                  <th>Game ID</th>
                  <th>API Key</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${keyRows}
              </tbody>
            </table>
            <button type="button" class="add-btn" onclick="addKeyRow()">Add New Key</button>
            <button type="submit">Save Changes</button>
          </form>
        </div>
      </body>
    </html>
  `;
}

/**
 * Handle /edit-keys endpoint
 */
async function handleEditKeys(request) {
  const cookie = request.headers.get('Cookie');
  if (!cookie || !cookie.includes('session=authenticated')) {
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/login' },
    });
  }

  if (request.method === 'GET') {
    const keys = await getGameApiKeysFromKV();
    return new Response(getEditKeysPage(keys), {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  if (request.method === 'POST') {
    const formData = await request.formData();
    const newKeys = {};
    let i = 0;
    while (formData.has(`gameId${i}`)) {
      const gameId = formData.get(`gameId${i}`);
      const apiKey = formData.get(`apiKey${i}`);
      if (gameId && apiKey) {
        newKeys[gameId] = apiKey;
      }
      i++;
    }

    const saved = await saveGameApiKeysToKV(newKeys);
    if (!saved) {
      return new Response(getEditKeysPage(newKeys, 'Failed to save keys'), {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    return new Response(getEditKeysPage(newKeys, 'Keys saved successfully'), {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  return new Response('Method Not Allowed', { status: 405 });
}

/**
 * Fetch the ban list (roblox_items.json) from GitHub
 */
async function fetchBanList() {
  console.log("Fetching ban list from:", BAN_LIST_GITHUB_URL);
  try {
    const response = await fetch(BAN_LIST_GITHUB_URL, { cache: "no-store" });
    if (!response.ok) {
      console.error(`Failed to fetch ban list: ${response.status} ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      console.error("Ban list is not an array:", JSON.stringify(data));
      return null;
    }
    console.log("Ban list fetched with", data.length, "items");
    return data;
  } catch (error) {
    console.error("Error fetching ban list:", error.message);
    return null;
  }
}

/**
 * Fetch the banned users list from GitHub
 */
async function fetchBannedUsers() {
  console.log("Fetching banned users from:", BANNED_USERS_GITHUB_URL);
  try {
    const response = await fetch(BANNED_USERS_GITHUB_URL, { cache: "no-store" });
    if (!response.ok) {
      console.error(`Failed to fetch banned users: ${response.status} ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      console.error("Banned users list is not an array:", JSON.stringify(data));
      return null;
    }
    console.log("Banned users fetched with", data.length, "entries");
    return data;
  } catch (error) {
    console.error("Error fetching banned users:", error.message);
    return null;
  }
}

/**
 * Update the banned users list on GitHub
 */
async function updateBannedUsers(bannedUsersArray) {
  if (!GITHUB_TOKEN) {
    console.error("GITHUB_TOKEN not set in environment variables");
    return false;
  }

  console.log("Preparing to update banned users list with", bannedUsersArray.length, "entries");

  try {
    console.log("Fetching SHA from:", GITHUB_API_URL);
    const getResponse = await fetch(GITHUB_API_URL, {
      headers: {
        "Authorization": `token ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Cloudflare-Worker-GoonBeGone",
      },
    });
    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      console.error(`Failed to get file SHA: ${getResponse.status} ${getResponse.statusText} - Details: ${errorText}`);
      return false;
    }
    const getData = await getResponse.json();
    const sha = getData.sha;
    console.log("Current file SHA:", sha);

    const newContent = JSON.stringify(bannedUsersArray, null, 2);
    const encodedContent = btoa(unescape(encodeURIComponent(newContent)));
    console.log("New encoded content length:", encodedContent.length);

    console.log("Sending update request to:", GITHUB_API_URL, "with", bannedUsersArray.length, "entries");
    const updateResponse = await fetch(GITHUB_API_URL, {
      method: "PUT",
      headers: {
        "Authorization": `token ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "Cloudflare-Worker-GoonBeGone",
      },
      body: JSON.stringify({
        message: `Add ban for user ${bannedUsersArray[bannedUsersArray.length - 1].userId}`,
        content: encodedContent,
        sha: sha,
        branch: "main",
      }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error(`Failed to update banned users: ${updateResponse.status} ${updateResponse.statusText} - Details: ${errorText}`);
      return false;
    }
    console.log("Successfully updated banned users with", bannedUsersArray.length, "entries");
    return true;
  } catch (error) {
    console.error("Error updating banned users:", error.message);
    return false;
  }
}

/**
 * Handle POST /check-items endpoint
 */
async function handleCheckItems(request) {
  try {
    const body = await request.json();
    const { userId, wearingItems } = body;

    console.log("Received check-items request:", JSON.stringify(body));

    if (!userId || !Array.isArray(wearingItems)) {
      console.error("Invalid request body");
      return new Response('Invalid request body. Expected { userId: number, wearingItems: array }', { status: 400 });
    }

    const banList = await fetchBanList();
    if (!banList) {
      return new Response('Error fetching ban list', { status: 500 });
    }

    const bannedUsers = await fetchBannedUsers();
    if (!bannedUsers) {
      return new Response('Error fetching banned users', { status: 500 });
    }

    const userBanEntry = bannedUsers.find(entry => entry.userId === userId);
    if (userBanEntry) {
      console.log(`User ${userId} is universally banned`);
      return new Response(JSON.stringify({ isBanned: true, banReason: "Universally Banned", bannedItems: userBanEntry.bannedItems }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const bannedItemIds = banList.map(item => `rbxassetid://${item.id}`);
    const flaggedItems = wearingItems.filter(itemId => bannedItemIds.includes(itemId));
    const wearingBannedItems = flaggedItems.length > 0;
    console.log(`User ${userId} wearing banned items: ${wearingBannedItems}`, "Flagged items:", JSON.stringify(flaggedItems));

    return new Response(
      JSON.stringify({
        isBanned: wearingBannedItems,
        banReason: wearingBannedItems ? "Wearing banned item" : null,
        bannedItems: wearingBannedItems ? flaggedItems : [],
        allowed: !wearingBannedItems && !userBanEntry
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in handleCheckItems:', error.message);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * Handle POST /ban-user endpoint
 */
async function handleBanUser(request) {
  try {
    const body = await request.json();
    const { userId, banReason, bannedItems } = body;

    console.log("Received ban-user request:", JSON.stringify(body));

    if (!userId || typeof userId !== 'number' || !Array.isArray(bannedItems)) {
      console.error("Invalid request body");
      return new Response('Invalid request body. Expected { userId: number, banReason: string, bannedItems: array }', { status: 400 });
    }

    let bannedUsers = await fetchBannedUsers();
    if (!bannedUsers) {
      console.error("Failed to fetch banned users list, initializing empty list");
      bannedUsers = [];
    } else {
      console.log("Current banned users before update:", JSON.stringify(bannedUsers));
    }

    const existingBan = bannedUsers.find(entry => entry.userId === userId);
    if (existingBan) {
      console.log(`User ${userId} already banned with items: ${JSON.stringify(existingBan.bannedItems)}, skipping update`);
      return new Response(JSON.stringify({ success: true, message: `User ${userId} already banned. Reason: ${existingBan.reason}` }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const newBanEntry = { userId, bannedItems, reason: banReason || "No reason provided" };
    bannedUsers.push(newBanEntry);
    console.log(`Appended user ${userId} to banned list. New list:`, JSON.stringify(bannedUsers));

    const updated = await updateBannedUsers(bannedUsers);
    if (!updated) {
      console.error("Failed to update banned users list on GitHub");
      return new Response('Failed to update banned users list', { status: 500 });
    }

    // Ping webhook after successful ban
    await pingWebhook(userId, bannedItems);

    console.log(`Ban successful for user ${userId}. Total banned users: ${bannedUsers.length}`);
    return new Response(JSON.stringify({ success: true, message: `User ${userId} banned. Reason: ${banReason || 'No reason provided'}` }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in handleBanUser:', error.message);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * Handle GET /fetch-banned-users endpoint
 */
async function fetchBannedUsersEndpoint(request) {
  try {
    const bannedUsers = await fetchBannedUsers();
    if (!bannedUsers) {
      return new Response('Error fetching banned users', { status: 500 });
    }
    console.log("Returning banned users with", bannedUsers.length, "entries");
    return new Response(JSON.stringify(bannedUsers), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetchBannedUsersEndpoint:', error.message);
    return new Response('Internal Server Error', { status: 500 });
  }
}
