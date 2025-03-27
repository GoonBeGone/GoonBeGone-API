addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

const BAN_LIST_GITHUB_URL = "https://raw.githubusercontent.com/GoonBeGone/GoonerAvatarList/main/roblox_items.json";
const GITHUB_OWNER = "GoonBeGone";
const GITHUB_REPO = "GoonerAvatarList";
const GITHUB_PATH = "banned_users.json";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
const ADMIN_USERNAME = "username";
const ADMIN_PASSWORD = "password";
const CRYPTO_ICONS = {
  monero: "https://cryptologos.cc/logos/monero-xmr-logo.png?v=032",
  ethereum: "https://cryptologos.cc/logos/ethereum-eth-logo.png?v=032",
  bitcoin: "https://cryptologos.cc/logos/bitcoin-btc-logo.png?v=032",
  litecoin: "https://cryptologos.cc/logos/litecoin-ltc-logo.png?v=032"
};

async function checkRateLimit(ip) {
  const key = `rate:${ip}`;
  let attempts = parseInt(await KV_NAMESPACE.get(key) || "0");
  if (attempts === 0) {
    await KV_NAMESPACE.put(key, "1", { expirationTtl: 60 });
  } else {
    await KV_NAMESPACE.put(key, (attempts + 1).toString(), { expirationTtl: 60 });
  }
  return attempts;
}

const SUGGESTIVE_WORDS = ["dsc", "blueapp", "slt", "bull"];
const SUGGESTIVE_REGEX = new RegExp(`\\b(${SUGGESTIVE_WORDS.join("|")})\\b`, "i");

function generateApiKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "KEY_";
  for (let i = 0; i < 12; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

function formatDate(date) {
  const pad = (n) => n.toString().padStart(2, "0");
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDate(dateStr) {
  const [datePart, timePart] = dateStr.split(", ");
  const [month, day, year] = datePart.split("/").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

function isPremium(user) {
  return user.subscription && new Date(user.subscription) > new Date();
}

async function getGameStats(placeId) {
  try {
    const url = `https://games.roblox.com/v1/games?universeIds=${placeId}`;
    const response = await fetch(url);
    if (!response.ok) return {};
    const data = await response.json();
    if (data.data && data.data.length > 0) {
      return { thumbnail: data.data[0].thumbnailUrl };
    }
    return {};
  } catch (e) {
    return {};
  }
}

function getSignupPage() {
  return `<html><head><title>Signup</title><style>:root { --primary-color: #333333; --accent-color: #d66129; }@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }body { background: linear-gradient(135deg, var(--primary-color), var(--accent-color)); background-size: 200% 200%; animation: fadeIn 1s ease-out; margin: 0; padding: 20px; font-family: 'Segoe UI', Arial, sans-serif; color: #fff; }.box { max-width: 320px; margin: 50px auto; padding: 20px; background: rgba(0,0,0,0.6); border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); animation: fadeIn 1s ease-out; }h2 { text-align: center; }input { width: 100%; margin: 10px 0; padding: 12px; background: rgba(255,255,255,0.1); color: #fff; border: none; border-radius: 5px; transition: background 0.3s; }input:focus { background: rgba(255,255,255,0.2); outline: none; }button { width: 100%; padding: 12px; background: var(--primary-color); color: white; border: none; border-radius: 5px; cursor: pointer; transition: background 0.3s, transform 0.2s; }button:hover { background: var(--accent-color); transform: scale(1.02); }</style></head><body><div class="box"><h2>Signup</h2><form method="POST" action="/signup"><input name="username" placeholder="Username" required><input name="email" type="email" placeholder="Email" required><input name="password" type="password" placeholder="Password" required><input name="gameId" placeholder="Game ID" required><button type="submit">Sign Up</button></form></div></body></html>`;
}

function getUserLoginPage(error = "") {
  return `<html><head><title>User Login</title><style>:root { --primary-color: #333333; --accent-color: #d66129; }@keyframes fadeIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }body { background: linear-gradient(135deg, var(--primary-color), var(--accent-color)); background-size: 200% 200%; animation: fadeIn 1s ease-out; margin: 0; padding: 20px; font-family: 'Segoe UI', Arial, sans-serif; color: #fff; }.box { max-width: 320px; margin: 50px auto; padding: 20px; background: rgba(0,0,0,0.6); border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); animation: fadeIn 1s ease-out; }h2 { text-align: center; }input { width: 100%; margin: 10px 0; padding: 12px; background: rgba(255,255,255,0.1); color: #fff; border: none; border-radius: 5px; transition: background 0.3s; }input:focus { background: rgba(255,255,255,0.2); outline: none; }button { width: 100%; padding: 12px; background: var(--primary-color); color: white; border: none; border-radius: 5px; cursor: pointer; transition: background 0.3s, transform 0.2s; }button:hover { background: var(--accent-color); transform: scale(1.02); }.error { color: #ff5555; text-align: center; }</style></head><body><div class="box"><h2>User Login</h2>${error ? `<p class="error">${error}</p>` : ""}<form method="POST" action="/login"><input name="username" placeholder="Username" required><input type="password" name="password" placeholder="Password" required><button type="submit">Login</button></form></div></body></html>`;
}

function getAdminLoginPage(error = "") {
  return `<html><head><title>Admin Login</title><style>:root { --primary-color: #333333; --accent-color: #d66129; }@keyframes fadeIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }body { background: linear-gradient(135deg, var(--primary-color), var(--accent-color)); background-size: 200% 200%; animation: fadeIn 1s ease-out; margin: 0; padding: 20px; font-family: 'Segoe UI', Arial, sans-serif; color: #fff; }.box { max-width: 320px; margin: 50px auto; padding: 20px; background: rgba(0,0,0,0.6); border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); animation: fadeIn 1s ease-out; }h2 { text-align: center; }input { width: 100%; margin: 10px 0; padding: 12px; background: rgba(255,255,255,0.1); color: #fff; border: none; border-radius: 5px; transition: background 0.3s; }input:focus { background: rgba(255,255,255,0.2); outline: none; }button { width: 100%; padding: 12px; background: var(--primary-color); color: white; border: none; border-radius: 5px; cursor: pointer; transition: background 0.3s, transform 0.2s; }button:hover { background: var(--accent-color); transform: scale(1.02); }.error { color: #ff5555; text-align: center; }</style></head><body><div class="box"><h2>Admin Login</h2>${error ? `<p class="error">${error}</p>` : ""}<form method="POST" action="/adminlogin"><input name="username" placeholder="Username" required><input type="password" name="password" placeholder="Password" required><button type="submit">Login</button></form></div></body></html>`;
}

function getHomePage(cookie, gamesHtml, bannedCount) {
  const isLoggedIn = cookie.includes("userSession=");
  const username = isLoggedIn ? cookie.split("userSession=")[1].split(";")[0] : null;
  return `<html><head><title>Ban Manager</title><style>:root { --primary-color: #333333; --accent-color: #d66129; }@keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }body { background: linear-gradient(135deg, var(--primary-color), var(--accent-color)); background-size: 200% 200%; animation: gradientShift 15s ease infinite; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #fff; }.container { max-width: 1200px; margin: 0 auto; padding: 40px; animation: fadeIn 1s ease-out; }.header { text-align: center; padding: 20px; background: rgba(0,0,0,0.5); border-radius: 10px; margin-bottom: 40px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }.header h1 { font-size: 48px; margin: 0; text-shadow: 0 0 10px rgba(0,0,0,0.5); }.header p { font-size: 18px; margin: 10px 0 0; }.nav { text-align: center; margin-bottom: 40px; }.nav a { color: #fff; text-decoration: none; font-size: 18px; margin: 0 10px; padding: 10px 20px; background: rgba(255,255,255,0.2); border-radius: 5px; transition: background 0.3s ease, transform 0.3s ease; }.nav a:hover { background: rgba(255,255,255,0.4); transform: scale(1.05); }.plans { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; margin-bottom: 40px; }.plan { background: rgba(0,0,0,0.5); padding: 20px; border-radius: 10px; width: 250px; text-align: center; transition: transform 0.3s, box-shadow 0.3s; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }.plan:hover { transform: translateY(-5px); box-shadow: 0 8px 20px rgba(0,0,0,0.4); }.crypto { display: flex; justify-content: center; gap: 10px; }.crypto img { width: 32px; height: 32px; transition: transform 0.3s; }.crypto img:hover { transform: scale(1.1); }.footer { text-align: center; font-size: 16px; margin-top: 20px; animation: fadeIn 1.5s ease-out; }.footer a { color: var(--accent-color); text-decoration: underline; }.games-section { margin-top: 40px; background: rgba(0,0,0,0.7); padding: 20px; border-radius: 10px; }.game-stats { display: inline-block; margin: 10px; }</style></head><body><div class="container"><div class="header"><h1>Ban Manager</h1><p>Protect Your Roblox Game with Advanced Moderation Tools</p></div><div class="nav"><a href="/userpanel">Dashboard</a><a href="/signup">Sign Up</a><a href="/login">User Login</a><a href="/adminlogin">Admin Login</a></div><h2 style="text-align: center; margin-bottom: 20px;">Premium Plans</h2><div class="plans"><div class="plan"><h3>1 Month</h3><p>$5</p><div class="crypto"><img src="${CRYPTO_ICONS.monero}" alt="Monero"><img src="${CRYPTO_ICONS.ethereum}" alt="Ethereum"><img src="${CRYPTO_ICONS.bitcoin}" alt="Bitcoin"><img src="${CRYPTO_ICONS.litecoin}" alt="Litecoin"></div></div><div class="plan"><h3>6 Months</h3><p>$30</p><div class="crypto"><img src="${CRYPTO_ICONS.monero}" alt="Monero"><img src="${CRYPTO_ICONS.ethereum}" alt="Ethereum"><img src="${CRYPTO_ICONS.bitcoin}" alt="Bitcoin"><img src="${CRYPTO_ICONS.litecoin}" alt="Litecoin"></div></div><div class="plan"><h3>12 Months</h3><p>$60</p><div class="crypto"><img src="${CRYPTO_ICONS.monero}" alt="Monero"><img src="${CRYPTO_ICONS.ethereum}" alt="Ethereum"><img src="${CRYPTO_ICONS.bitcoin}" alt="Bitcoin"><img src="${CRYPTO_ICONS.litecoin}" alt="Litecoin"></div></div></div><div class="footer"><p>We accept payments in crypto only: Monero (XMR), Ethereum (ETH), Bitcoin (BTC), and Litecoin (LTC). To purchase a subscription, please make a ticket in our Discord: <a href="https://discord.gg/MrAFwHw8RV">Join Discord</a></p></div><div class="games-section"><h2 style="text-align: center;">Game Stats</h2><p style="text-align: center;">Total Banned Users: ${bannedCount}</p>${gamesHtml}</div></div></body></html>`;
}

async function fetchOutfitIds(userId) {
  try {
    const response = await fetch(`https://avatar.roproxy.com/v1/users/${userId}/outfits?itemsPerPage=50`, { method: "GET", headers: { "Accept": "application/json" } });
    if (!response.ok) return [];
    const data = await response.json();
    return data.data.map((outfit) => outfit.id);
  } catch (error) {
    return [];
  }
}

async function fetchOutfitDetails(outfitId) {
  try {
    const response = await fetch(`https://avatar.roproxy.com/v1/outfits/${outfitId}/details`, { method: "GET", headers: { "Accept": "application/json" } });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.assets || []).map((asset) => `rbxassetid://${asset.id}`);
  } catch (error) {
    return [];
  }
}

async function getUserDataFromKV() {
  try {
    return JSON.parse(await KV_NAMESPACE.get("userData") || "{}");
  } catch (e) {
    return {};
  }
}

async function saveUserDataToKV(data) {
  try {
    await KV_NAMESPACE.put("userData", JSON.stringify(data));
  } catch (e) {}
}

async function fetchBanList() {
  try {
    const response = await fetch(BAN_LIST_GITHUB_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to fetch ban list: ${response.status}`);
    const data = await response.json();
    return data.map((item) => ({ id: item.id, name: item.name, isSuggestive: SUGGESTIVE_REGEX.test(item.name) }));
  } catch (e) {
    return null;
  }
}

async function fetchBannedUsers() {
  try {
    const response = await fetch(GITHUB_API_URL, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "Cloudflare-Worker"
      },
      cache: "no-store"
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch banned_users.json: ${response.status} - ${errorText}`);
    }
    const fileData = await response.json();
    const content = atob(fileData.content.replace(/\n/g, ""));
    const data = JSON.parse(content);
    if (!Array.isArray(data)) return [];
    return data;
  } catch (e) {
    return [];
  }
}

async function updateBannedUsersOnGitHub(updatedBannedUsers, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const getResponse = await fetch(GITHUB_API_URL, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${GITHUB_TOKEN}`,
          "Accept": "application/vnd.github+json",
          "User-Agent": "Cloudflare-Worker"
        }
      });
      if (!getResponse.ok) throw new Error(`GET failed: ${getResponse.status}`);
      const fileData = await getResponse.json();
      const currentSha = fileData.sha;
      const newContent = JSON.stringify(updatedBannedUsers, null, 2);
      const base64Content = btoa(unescape(encodeURIComponent(newContent)));
      const updateResponse = await fetch(GITHUB_API_URL, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${GITHUB_TOKEN}`,
          "Accept": "application/vnd.github+json",
          "User-Agent": "Cloudflare-Worker"
        },
        body: JSON.stringify({
          message: "Update ban list",
          content: base64Content,
          sha: currentSha,
          branch: "main"
        })
      });
      if (!updateResponse.ok) {
        if (updateResponse.status === 409) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        throw new Error(`Update failed: ${updateResponse.status}`);
      }
      return true;
    } catch (error) {
      if (i === retries - 1) return false;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return false;
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  let aSorted = [...a].sort();
  let bSorted = [...b].sort();
  for (let i = 0; i < aSorted.length; i++) {
    if (aSorted[i] !== bSorted[i]) return false;
  }
  return true;
}

async function fetchUserBanLog(request, user) {
  const banLog = JSON.parse(await KV_NAMESPACE.get(`banLog:${user.gameId}`) || "[]");
  return new Response(JSON.stringify(banLog), { status: 200, headers: { "Content-Type": "application/json" } });
}

async function handleSignup(request, ip) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const username = formData.get("username");
  const gameId = formData.get("gameId");
  if (!email) return new Response("Email is required", { status: 400 });
  const allowedDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"];
  const emailParts = email.split("@");
  if (emailParts.length !== 2 || !allowedDomains.includes(emailParts[1].toLowerCase()))
    return new Response("Only Gmail, Yahoo, Outlook, and Hotmail emails are allowed", { status: 400 });
  if (!password || !username || !gameId || (await checkRateLimit(ip)) >= 5)
    return new Response("Missing fields or too many attempts", { status: 400 });
  if (username.length > 24) return new Response("Username must be 24 characters or less", { status: 400 });
  const pendingSignups = JSON.parse(await KV_NAMESPACE.get("pendingSignups") || "{}");
  const userData = await getUserDataFromKV();
  if (userData[username] || pendingSignups[username])
    return new Response("Username already taken", { status: 400 });
  pendingSignups[username] = { email, password, gameId, ip, signupTime: formatDate(new Date()) };
  await KV_NAMESPACE.put("pendingSignups", JSON.stringify(pendingSignups));
  return new Response("Signup submitted. Awaiting approval.", { status: 200 });
}

async function handleUserLogin(request, ip) {
  const formData = await request.formData();
  if ((await checkRateLimit(ip)) >= 5)
    return new Response("Too many login attempts", { status: 429 });
  const username = formData.get("username");
  const password = formData.get("password");
  const userData = await getUserDataFromKV();
  if (userData[username] && userData[username].password === password) {
    const headers = new Headers();
    headers.set("Set-Cookie", `userSession=${username}; Path=/; HttpOnly`);
    headers.set("Location", "/userpanel");
    userData[username].lastIp = ip;
    userData[username].lastOnline = formatDate(new Date());
    await saveUserDataToKV(userData);
    return new Response(null, { status: 302, headers });
  }
  return new Response(getUserLoginPage("Invalid credentials"), { status: 200, headers: { "Content-Type": "text/html" } });
}

async function handleAdminLogin(request, ip) {
  const formData = await request.formData();
  if ((await checkRateLimit(ip)) >= 5)
    return new Response("Too many login attempts", { status: 429 });
  const username = formData.get("username");
  const password = formData.get("password");
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const headers = new Headers();
    headers.set("Set-Cookie", "adminSession=authenticated; Path=/; HttpOnly");
    headers.set("Location", "/adminpanel");
    await KV_NAMESPACE.put(`lastLogin:${ip}`, formatDate(new Date()));
    return new Response(null, { status: 302, headers });
  }
  return new Response(getAdminLoginPage("Invalid credentials"), { status: 200, headers: { "Content-Type": "text/html" } });
}

async function handleUserPanel(request, ip) {
  const cookie = request.headers.get("Cookie");
  if (!cookie || !cookie.includes("userSession="))
    return new Response(null, { status: 302, headers: { "Location": "/login" } });
  const username = cookie.split("userSession=")[1].split(";")[0];
  const userData = await getUserDataFromKV();
  const user = userData[username];
  if (!user) return new Response("User not found", { status: 404 });
  if (request.method === "POST") {
    const formData = await request.formData();
    if (formData.get("action") === "newKey" && (!user.apiKeys || user.apiKeys.length < 3)) {
      user.apiKeys = user.apiKeys || [user.apiKey];
      user.apiKeys.push(generateApiKey());
      await saveUserDataToKV(userData);
    } else if (formData.get("action") === "updateConfig") {
      const body = {
        username,
        globalBan: formData.get("globalBan") === "on",
        ban: formData.get("ban") === "on",
        kick: formData.get("kick") === "on",
        alert: formData.get("alert") === "on",
        silentLog: formData.get("silentLog") === "on",
        savedOutfitDetection: formData.get("savedOutfitDetection") === "on"
      };
      if (isPremium(user)) {
        body.checkDescription = formData.get("checkDescription") === "on";
        body.checkUsername = formData.get("checkUsername") === "on";
      }
      await handleConfigUpdate(request, username, body);
    }
  }
  const apiKeys = user.apiKeys ? user.apiKeys.join("<br>") : user.apiKey;
  const inbox = user.inbox || [];
  const inboxHtml = inbox.length > 0 ? inbox.map(msg => `<p><strong>${msg.timestamp}</strong>: ${msg.message}</p>`).join("") : "<p>No messages</p>";
  const subMessage = user.subscription ? `<p style="color:#55ff55">Premium until: ${user.subscription}</p>` : "<p>Upgrade to premium for additional features!</p>";
  const config = user.config || { globalBan: true, ban: true, kick: true, alert: false, silentLog: false, checkDescription: false, checkUsername: false, savedOutfitDetection: false };
  const banLog = JSON.parse(await KV_NAMESPACE.get(`banLog:${user.gameId}`) || "[]");
  const banLogHtml = banLog.length > 0 ? banLog.map(entry => `<tr><td>${entry.userId}</td><td>${entry.timestamp}</td><td>${entry.reason}</td><td>${entry.bannedItems.join(", ")}</td></tr>`).join("") : "<tr><td colspan='4'>No bans recorded</td></tr>";
  const silentLogs = JSON.parse(await KV_NAMESPACE.get("silentLogs:" + user.gameId) || "[]");
  const silentLogHtml = silentLogs.length > 0 ? silentLogs.map(entry => `<tr><td>${entry.moderator || user.gameId}</td><td>${entry.targetUserId}</td><td>${entry.timestamp}</td><td>${entry.banReason}</td><td>${Array.isArray(entry.flaggedItems) ? entry.flaggedItems.join(", ") : entry.flaggedItems}</td></tr>`).join("") : "<tr><td colspan='5'>No silent logs recorded</td></tr>";
  return new Response(`<html><head><title>User Panel</title><style>:root { --primary-color: #333333; --accent-color: #d66129; }@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }body { background: linear-gradient(135deg, var(--primary-color), var(--accent-color)); background-size: 200% 200%; animation: fadeIn 1s ease-out; color: #fff; font-family: Arial, sans-serif; padding: 20px; }.container { max-width: 800px; margin: auto; padding: 20px; background: rgba(0,0,0,0.6); border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.5); animation: fadeIn 1s ease-out; }button { padding: 5px 10px; background: var(--primary-color); color: white; border: none; border-radius: 3px; cursor: pointer; transition: background 0.3s, transform 0.2s; }button:hover { background: var(--accent-color); transform: scale(1.02); }input[type="text"] { padding: 5px; background: rgba(255,255,255,0.1); color: #fff; border: none; border-radius: 3px; width: 100%; }input[type="checkbox"] { margin: 2px; }table { width: 100%; border-collapse: collapse; margin-top: 10px; }th, td { padding: 8px; border: 1px solid rgba(255,255,255,0.2); text-align: left; }th { background: rgba(0,0,0,0.3); }</style></head><body><div class="container"><h1>User Panel</h1><p>Welcome, ${username}!</p>${subMessage}<h3>Your API Key(s):</h3><p>${apiKeys}</p><form method="POST"><button type="submit" name="action" value="newKey" ${user.apiKeys && user.apiKeys.length >= 3 ? "disabled" : ""}>Request New Key (Max 3)</button></form><h3>Configuration</h3><form method="POST"><input type="hidden" name="action" value="updateConfig"><label><input type="checkbox" name="globalBan" ${config.globalBan ? "checked" : ""}> Respect Global Bans</label><br><label><input type="checkbox" name="ban" ${config.ban ? "checked" : ""}> Auto-Ban Players</label><br><label><input type="checkbox" name="kick" ${config.kick ? "checked" : ""}> Auto-Kick Players</label><br><label><input type="checkbox" name="alert" ${config.alert ? "checked" : ""}> Log Bans</label><br><label><input type="checkbox" name="silentLog" ${config.silentLog ? "checked" : ""}> Silent Logging (No auto-ban/kick, just log)</label><br>${isPremium(user) ? `<label><input type="checkbox" name="checkDescription" ${config.checkDescription ? "checked" : ""}> Check Player Description (Regex)</label><br><label><input type="checkbox" name="checkUsername" ${config.checkUsername ? "checked" : ""}> Check Display/Username (Regex)</label><br><label><input type="checkbox" name="savedOutfitDetection" ${config.savedOutfitDetection ? "checked" : ""}> Detect Saved Outfits</label><br>` : `<p style="color:#ff5555">Premium features available with a subscription.</p>`}<button type="submit">Save Config</button></form><h3>Inbox</h3>${inboxHtml}<h3>Your Ban Log (Game ID: ${user.gameId})</h3><table><tr><th>User ID</th><th>Timestamp</th><th>Reason</th><th>Banned Items</th></tr>${banLogHtml}</table><h3>Your Silent Logs (Game ID: ${user.gameId})</h3><table><tr><th>Moderator/Game ID</th><th>Target User ID</th><th>Timestamp</th><th>Reason</th><th>Flagged Items</th></tr>${silentLogHtml}</table></div></body></html>`, { status: 200, headers: { "Content-Type": "text/html" } });
}

async function handleClearSilentLogs(request, body) {
  const userData = await getUserDataFromKV();
  const gameIds = new Set();
  for (const user of Object.values(userData)) {
    if (user.gameId) gameIds.add(user.gameId);
  }
  for (const gameId of gameIds) {
    await KV_NAMESPACE.put("silentLogs:" + gameId, JSON.stringify([]));
  }
  return new Response(JSON.stringify({ success: true, message: "All silent logs cleared" }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

async function handleAdminPanel(request, ip) {
  const cookie = request.headers.get("Cookie");
  if (!cookie || !cookie.includes("adminSession=authenticated"))
    return new Response(null, { status: 302, headers: { "Location": "/adminlogin" } });
  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: "Invalid request body" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (body.action === "approve" || body.action === "reject")
      return handleEditKeys(request, body);
    if (body.action === "deleteAccount")
      return handleDeleteAccount(request, body);
    if (body.action === "revoke")
      return handleRevokeKey(request, body);
    if (body.action === "updateSub")
      return handleUpdateSubscription(request, body);
    if (body.action === "updateConfig")
      return handleConfigUpdate(request, body.username, body);
    if (body.action === "sendMessage")
      return handleSendMessage(request, body);
    if (body.action === "manualBan")
      return handleManualBan(request, body);
    if (body.action === "unban")
      return handleUnban(request, body);
    if (body.action === "clearBanLog")
      return handleClearBanLog(request);
    if (body.action === "cleanupOldBanLog")
      return handleCleanupOldBanLog(request, body);
    if (body.action === "clearSilentLogs")
      return handleClearSilentLogs(request, body);
    return new Response(JSON.stringify({ success: false, error: "Unknown action" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const userData = await getUserDataFromKV();
  const pending = JSON.parse(await KV_NAMESPACE.get("pendingSignups") || "{}");
  const globalBanLog = JSON.parse(await KV_NAMESPACE.get("banLog") || "[]");
  const usersHtml = await (async () => {
    let html = "";
    for (const [username, data] of Object.entries(userData)) {
      html += `<tr><td>${username}</td><td>${data.gameId}</td><td>${data.apiKeys ? data.apiKeys.join("<br>") : data.apiKey}</td><td>${data.password}</td><td>${data.signupIp || "N/A"} / ${data.lastIp || "N/A"}</td><td>${data.signupTime || "N/A"} / ${data.lastOnline || "N/A"}</td><td><select onchange="updateSub('${username}', this.value)"><option value="">${data.subscription || "None"}</option><option value="1month">1 Month</option><option value="6months">6 Months</option><option value="1year">1 Year</option></select><br><button class="action-btn" onclick="removeSub('${username}')">Remove Subscription</button></td><td><button class="action-btn delete" onclick="deleteAccount('${username}')">Delete Account</button><br><button class="action-btn revoke" onclick="revokeApiKey('${username}')">Revoke API Key</button><br><button class="action-btn message" onclick="sendMessage('${username}')">Send Message</button></td></tr>`;
    }
    return html;
  })();
  const pendingHtml = Object.entries(pending).map(([username, data]) => `<tr><td>${username}</td><td>${data.email}</td><td>${data.gameId}</td><td>${data.password}</td><td>${data.ip}</td><td>${data.signupTime}</td><td><button class="action-btn approve" onclick="approve('${username}')">Approve</button><button class="action-btn reject" onclick="reject('${username}')">Reject</button></td></tr>`).join("");
  const banLogHtml = globalBanLog.length > 0 ? globalBanLog.map(entry => `<tr><td>${entry.userId}</td><td>${entry.timestamp}</td><td>${entry.reason}</td><td>${Array.isArray(entry.bannedItems) ? entry.bannedItems.join(", ") : "N/A"}</td><td><button class="action-btn unban" onclick="unban('${entry.userId}', '${entry.timestamp}')">Unban</button></td></tr>`).join("") : "<tr><td colspan='5'>No bans recorded</td></tr>";
  let silentLogsHtml = "";
  for (const userObj of Object.values(userData)) {
    const silentLogKey = "silentLogs:" + userObj.gameId;
    let logs = await KV_NAMESPACE.get(silentLogKey);
    if (logs) {
      logs = JSON.parse(logs);
      for (const log of logs) {
         silentLogsHtml += `<tr><td>${log.moderator || userObj.gameId}</td><td>${log.targetUserId}</td><td>${log.timestamp}</td><td>${log.banReason}</td><td>${Array.isArray(log.flaggedItems) ? log.flaggedItems.join(", ") : log.flaggedItems}</td></tr>`;
      }
    }
  }
  if (!silentLogsHtml) silentLogsHtml = "<tr><td colspan='5'>No silent logs recorded</td></tr>";
  return new Response(
    `<html><head><title>Admin Panel</title><style>
      :root { --primary-color: #333333; --accent-color: #d66129; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      body { background: linear-gradient(135deg, var(--primary-color), var(--accent-color)); background-size: 200% 200%; animation: fadeIn 1s ease-out; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; color: #fff; }
      .container { max-width: 1400px; margin: 0 auto; padding: 40px; animation: fadeIn 1s ease-out; }
      .header { text-align: center; padding: 20px; background: rgba(0,0,0,0.5); border-radius: 10px; margin-bottom: 40px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
      .header h1 { font-size: 48px; margin: 0; }
      .section { background: rgba(0,0,0,0.6); padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); animation: fadeIn 1s ease-out; }
      .section h2 { font-size: 24px; margin: 0 0 20px; }
      table { width: 100%; border-collapse: collapse; animation: fadeIn 1s ease-out; }
      th, td { padding: 10px; border: 1px solid rgba(255,255,255,0.2); text-align: left; }
      th { background: rgba(0,0,0,0.3); }
      .action-btn { padding: 5px 10px; margin: 2px 0; background: var(--primary-color); color: #fff; border: none; border-radius: 5px; cursor: pointer; transition: background 0.3s, transform 0.2s; }
      .action-btn:hover { background: var(--accent-color); transform: scale(1.05); }
      input[type="text"], select { padding: 5px; background: rgba(255,255,255,0.1); color: #fff; border: none; border-radius: 3px; width: 100%; transition: background 0.3s; }
      input[type="checkbox"] { margin: 2px; }
      </style></head><body>
      <div class="container">
        <div class="header"><h1>Admin Panel</h1></div>
        <div class="section">
          <h2>Users</h2>
          <table>
            <tr>
              <th>Username</th>
              <th>Game ID</th>
              <th>API Key(s)</th>
              <th>Password</th>
              <th>Signup/Last IP</th>
              <th>Signup/Last Online</th>
              <th>Subscription</th>
              <th>Action</th>
            </tr>
            ${usersHtml}
          </table>
        </div>
        <div class="section">
          <h2>Pending Signups</h2>
          <table>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Game ID</th>
              <th>Password</th>
              <th>Signup IP</th>
              <th>Signup Time</th>
              <th>Action</th>
            </tr>
            ${pendingHtml}
          </table>
        </div>
        <div class="section">
          <h2>Manual Ban</h2>
          <form id="manualBanForm">
            <input type="text" id="banUserId" placeholder="User ID" required>
            <input type="text" id="banReason" placeholder="Ban Reason" required>
            <input type="text" id="banItems" placeholder="Banned Items (comma-separated)">
            <button class="action-btn" type="button" onclick="manualBan()">Ban User</button>
          </form>
        </div>
        <div class="section">
          <h2>Global Ban Log</h2>
          <button class="action-btn" onclick="clearBanLog()">Clear All Ban Logs</button>
          <button class="action-btn" onclick="cleanupOldBanLog()">Remove Entries Older Than 30 Days</button>
          <table>
            <tr>
              <th>User ID</th>
              <th>Timestamp</th>
              <th>Reason</th>
              <th>Banned Items</th>
              <th>Action</th>
            </tr>
            ${banLogHtml}
          </table>
        </div>
        <div class="section">
          <h2>Silent Logs</h2>
          <button class="action-btn" onclick="clearSilentLogs()">Clear All Silent Logs</button>
          <table>
            <tr>
              <th>Moderator/Game ID</th>
              <th>Target User ID</th>
              <th>Timestamp</th>
              <th>Reason</th>
              <th>Flagged Items</th>
            </tr>
            ${silentLogsHtml}
          </table>
        </div>
      </div>
      <script>
        async function approve(u){await fetch('/adminpanel',{method:'POST',body:JSON.stringify({action:'approve',username:u}),headers:{'Content-Type':'application/json'}});location.reload();}
        async function reject(u){await fetch('/adminpanel',{method:'POST',body:JSON.stringify({action:'reject',username:u}),headers:{'Content-Type':'application/json'}});location.reload();}
        async function deleteAccount(u){if(confirm("Are you sure you want to delete the account for "+u+"? This action cannot be undone.")){await fetch('/adminpanel',{method:'POST',body:JSON.stringify({action:'deleteAccount',username:u}),headers:{'Content-Type':'application/json'}});location.reload();}}
        async function revokeApiKey(u){if(confirm("Are you sure you want to revoke the API key for "+u+"?")){await fetch('/adminpanel',{method:'POST',body:JSON.stringify({action:'revoke',username:u}),headers:{'Content-Type':'application/json'}});location.reload();}}
        async function updateSub(u,v){await fetch('/adminpanel',{method:'POST',body:JSON.stringify({action:'updateSub',username:u,subscription:v}),headers:{'Content-Type':'application/json'}});location.reload();}
        async function removeSub(u){if(confirm("Are you sure you want to remove the subscription for "+u+"?")){await fetch('/adminpanel',{method:'POST',body:JSON.stringify({action:'updateSub',username:u,subscription:"none"}),headers:{'Content-Type':'application/json'}});location.reload();}}
        async function updateConfig(u,field,value){await fetch('/adminpanel',{method:'POST',body:JSON.stringify({action:'updateConfig',username:u,field,value}),headers:{'Content-Type':'application/json'}});}
        async function sendMessage(u){const msg=prompt('Enter message for '+u);if(msg)await fetch('/adminpanel',{method:'POST',body:JSON.stringify({action:'sendMessage',username:u,message:msg}),headers:{'Content-Type':'application/json'}});location.reload();}
        async function manualBan(){const userId=document.getElementById('banUserId').value;const reason=document.getElementById('banReason').value;const items=document.getElementById('banItems').value.split(',').map(i=>i.trim());await fetch('/adminpanel',{method:'POST',body:JSON.stringify({action:'manualBan',userId,banReason:reason,bannedItems:items}),headers:{'Content-Type':'application/json'}});location.reload();}
        async function unban(userId,timestamp){await fetch('/adminpanel',{method:'POST',body:JSON.stringify({action:'unban',userId,timestamp}),headers:{'Content-Type':'application/json'}});location.reload();}
        async function clearBanLog(){if(confirm('Are you sure you want to clear all ban logs?')){await fetch('/adminpanel',{method:'POST',body:JSON.stringify({action:'clearBanLog'}),headers:{'Content-Type':'application/json'}});location.reload();}}
        async function cleanupOldBanLog(){if(confirm('Remove all ban log entries older than 30 days?')){await fetch('/adminpanel',{method:'POST',body:JSON.stringify({action:'cleanupOldBanLog',days:30}),headers:{'Content-Type':'application/json'}});location.reload();}}
        async function clearSilentLogs(){if(confirm('Are you sure you want to clear all silent logs?')){await fetch('/adminpanel',{method:'POST',body:JSON.stringify({action:'clearSilentLogs'}),headers:{'Content-Type':'application/json'}});location.reload();}}
      </script>
      </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}

async function handleCheckItems(request, user) {
  try {
    const body = await request.json();
    const userId = body.userId;
    const wearingItems = body.wearingItems || [];
    const description = body.description || "";
    const playerUsername = body.username || "";
    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const config = user.config || { globalBan: true, ban: true, kick: true, alert: false, silentLog: false, checkDescription: false, checkUsername: false, savedOutfitDetection: false };
    const banList = await fetchBanList();
    if (!banList) {
      return new Response(JSON.stringify({ error: "Failed to fetch ban list" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    const bannedUsers = await fetchBannedUsers() || [];
    const userBanEntry = bannedUsers.find(entry => entry.userId === userId);
    if (userBanEntry && config.globalBan) {
      if (config.alert || config.silentLog) {
        const userBanLogKey = `banLog:${user.gameId}`;
        let userBanLog = JSON.parse(await KV_NAMESPACE.get(userBanLogKey) || "[]");
        const newLog = {
          userId,
          bannedItems: userBanEntry.bannedItems,
          reason: "Universally Banned",
          timestamp: formatDate(new Date())
        };
        if (!userBanLog.some(log => log.userId === newLog.userId &&
             log.reason === newLog.reason &&
             arraysEqual(log.bannedItems, newLog.bannedItems))) {
          userBanLog.push(newLog);
          await KV_NAMESPACE.put(userBanLogKey, JSON.stringify(userBanLog));
        }
      }
      return new Response(JSON.stringify({ isBanned: true, kick: config.kick, banReason: "Universally Banned" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    const bannedItemIds = banList.map(item => `rbxassetid://${item.id}`);
    const suggestiveItemIds = banList.filter(item => item.isSuggestive).map(item => `rbxassetid://${item.id}`);
    const wearingMatches = wearingItems.filter(itemId => bannedItemIds.includes(itemId));
    const wearingSuggestive = wearingItems.filter(itemId => suggestiveItemIds.includes(itemId));
    let outfitMatches = [];
    let outfitSuggestive = [];
    if (config.savedOutfitDetection) {
      const outfitIds = await fetchOutfitIds(userId);
      for (const outfitId of outfitIds) {
        const outfitItemIds = await fetchOutfitDetails(outfitId);
        outfitMatches = outfitMatches.concat(outfitItemIds.filter(itemId => bannedItemIds.includes(itemId)));
        outfitSuggestive = outfitSuggestive.concat(outfitItemIds.filter(itemId => suggestiveItemIds.includes(itemId)));
      }
    }
    const flaggedItems = [...new Set([...wearingMatches, ...wearingSuggestive, ...outfitMatches, ...outfitSuggestive])];
    let isFlagged = flaggedItems.length > 0;
    let banReason = isFlagged ? "Wearing or owning banned/suggestive items" : null;
    if (isPremium(user)) {
      if (config.checkDescription && description && SUGGESTIVE_REGEX.test(description)) {
        isFlagged = true;
        banReason = "Inappropriate description detected";
      }
      if (config.checkUsername && playerUsername && SUGGESTIVE_REGEX.test(playerUsername)) {
        isFlagged = true;
        banReason = "Inappropriate username detected";
      }
    }
    if (isFlagged && (config.alert || config.silentLog)) {
      const userBanLogKey = `banLog:${user.gameId}`;
      let userBanLog = JSON.parse(await KV_NAMESPACE.get(userBanLogKey) || "[]");
      const newLog = {
        userId,
        bannedItems: flaggedItems,
        reason: banReason,
        timestamp: formatDate(new Date())
      };
      if (!userBanLog.some(log => log.userId === newLog.userId &&
           log.reason === newLog.reason &&
           arraysEqual(log.bannedItems, newLog.bannedItems))) {
        userBanLog.push(newLog);
        await KV_NAMESPACE.put(userBanLogKey, JSON.stringify(userBanLog));
      }
    }
    if (isFlagged && config.silentLog && !config.ban && !config.kick) {
      const silentLogKey = "silentLogs:" + user.gameId;
      let silentLogs = await KV_NAMESPACE.get(silentLogKey);
      silentLogs = silentLogs ? JSON.parse(silentLogs) : [];
      const newSilentLog = {
        targetUserId: userId,
        flaggedItems,
        banReason,
        timestamp: formatDate(new Date())
      };
      if (!silentLogs.some(log => log.targetUserId === newSilentLog.targetUserId &&
           log.banReason === newSilentLog.banReason &&
           arraysEqual(log.flaggedItems, newSilentLog.flaggedItems))) {
        silentLogs.push(newSilentLog);
        await KV_NAMESPACE.put(silentLogKey, JSON.stringify(silentLogs));
      }
      return new Response(JSON.stringify({ isBanned: false, kick: false, message: "Flagged event logged silently", flaggedItems }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ isBanned: config.ban && isFlagged, kick: config.kick && isFlagged, banReason: isFlagged ? banReason : null, flaggedItems: flaggedItems.length > 0 ? flaggedItems : [] }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

async function handleClearBanLog(request) {
  try {
    await KV_NAMESPACE.put("banLog", JSON.stringify([]));
    return new Response(JSON.stringify({ success: true, message: "Global ban log cleared" }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: "Failed to clear global ban log" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

async function handleCleanupOldBanLog(request, body) {
  const days = body.days || 30;
  try {
    let banLog = JSON.parse(await KV_NAMESPACE.get("banLog") || "[]");
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const filteredBanLog = banLog.filter(entry => parseDate(entry.timestamp) >= cutoffDate);
    await KV_NAMESPACE.put("banLog", JSON.stringify(filteredBanLog));
    return new Response(JSON.stringify({ success: true, message: `Removed global ban log entries older than ${days} days` }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: "Failed to cleanup old global ban log entries" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

async function handleDeleteAccount(request, body) {
  const userData = await getUserDataFromKV();
  if (userData[body.username]) {
    delete userData[body.username];
    await saveUserDataToKV(userData);
    return new Response(JSON.stringify({ success: true, message: `User ${body.username} deleted` }), { status: 200, headers: { "Content-Type": "application/json" } });
  } else {
    return new Response(JSON.stringify({ success: false, message: "User not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }
}

async function handleEditKeys(request, body) {
  const pending = JSON.parse(await KV_NAMESPACE.get("pendingSignups") || "{}");
  if (body.action === "approve") {
    const user = pending[body.username];
    if (user) {
      const apiKey = generateApiKey();
      let userData = await getUserDataFromKV();
      userData[body.username] = {
        email: user.email,
        gameId: user.gameId,
        apiKey,
        password: user.password,
        signupIp: user.ip,
        signupTime: user.signupTime,
        lastIp: user.ip,
        lastOnline: formatDate(new Date()),
        config: { globalBan: true, ban: true, kick: true, alert: false, checkDescription: false, checkUsername: false, silentLog: false, savedOutfitDetection: false },
        inbox: [{ timestamp: formatDate(new Date()), message: "Welcome! Your account has been approved." }]
      };
      await saveUserDataToKV(userData);
      delete pending[body.username];
      await KV_NAMESPACE.put("pendingSignups", JSON.stringify(pending));
    }
  } else if (body.action === "reject") {
    delete pending[body.username];
    await KV_NAMESPACE.put("pendingSignups", JSON.stringify(pending));
  }
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
}

async function handleRevokeKey(request, body) {
  const userData = await getUserDataFromKV();
  if (userData[body.username]) {
    userData[body.username].apiKey = generateApiKey();
    delete userData[body.username].apiKeys;
    userData[body.username].inbox = userData[body.username].inbox || [];
    userData[body.username].inbox.push({ timestamp: formatDate(new Date()), message: "Your API keys have been revoked and replaced with a new one." });
    await saveUserDataToKV(userData);
  }
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
}

async function handleUpdateSubscription(request, body) {
  const userData = await getUserDataFromKV();
  if (userData[body.username]) {
    if (body.subscription === "none") {
      delete userData[body.username].subscription;
      userData[body.username].inbox = userData[body.username].inbox || [];
      userData[body.username].inbox.push({ timestamp: formatDate(new Date()), message: "Your premium subscription has been removed." });
    } else {
      const expiry = new Date();
      const days = body.subscription === "1month" ? 30 : body.subscription === "6months" ? 180 : 365;
      expiry.setDate(expiry.getDate() + days);
      userData[body.username].subscription = formatDate(expiry);
      userData[body.username].inbox = userData[body.username].inbox || [];
      userData[body.username].inbox.push({ timestamp: formatDate(new Date()), message: `You’ve been granted a ${body.subscription === "1month" ? "1-month" : body.subscription === "6months" ? "6-month" : "1-year"} premium subscription! Expires: ${formatDate(expiry)}` });
    }
    await saveUserDataToKV(userData);
  }
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
}

async function handleSendMessage(request, body) {
  const userData = await getUserDataFromKV();
  if (userData[body.username]) {
    userData[body.username].inbox = userData[body.username].inbox || [];
    userData[body.username].inbox.push({ timestamp: formatDate(new Date()), message: body.message });
    await saveUserDataToKV(userData);
  }
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
}

async function fetchBannedUsersEndpoint(request) {
  const bannedUsers = await fetchBannedUsers();
  if (!bannedUsers) return new Response("Error fetching banned users", { status: 500 });
  return new Response(JSON.stringify(bannedUsers), { status: 200, headers: { "Content-Type": "application/json" } });
}

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const clientIp = request.headers.get("CF-Connecting-IP") || "Unknown";
  const cookie = request.headers.get("Cookie") || "";
  if (path === "/" && method === "GET") {
    const userData = await getUserDataFromKV();
    const gameIds = Object.values(userData).map(u => u.gameId).filter(Boolean);
    const uniqueGameIds = [...new Set(gameIds)];
    let gamesHtml = "";
    for (const placeId of uniqueGameIds) {
      const stats = await getGameStats(placeId);
      gamesHtml += `<div class="game-stats" style="text-align: center; margin: 10px;"><a href="https://www.roblox.com/games/${placeId}" target="_blank">${stats && stats.thumbnail ? `<img src="${stats.thumbnail}" alt="Game Thumbnail" />` : 'No Image Available'}</a></div>`;
    }
    const bannedUsers = "";
    return new Response(getHomePage(cookie, gamesHtml, bannedUsers), { status: 200, headers: { "Content-Type": "text/html" } });
  }
  if (path === "/signup" && method === "GET") return new Response(getSignupPage(), { status: 200, headers: { "Content-Type": "text/html" } });
  if (path === "/signup" && method === "POST") return handleSignup(request, clientIp);
  if (path === "/login" && method === "GET") return new Response(getUserLoginPage(), { status: 200, headers: { "Content-Type": "text/html" } });
  if (path === "/login" && method === "POST") return handleUserLogin(request, clientIp);
  if (path === "/adminlogin" && method === "GET") return new Response(getAdminLoginPage(), { status: 200, headers: { "Content-Type": "text/html" } });
  if (path === "/adminlogin" && method === "POST") return handleAdminLogin(request, clientIp);
  if (path === "/userpanel") return handleUserPanel(request, clientIp);
  if (path === "/adminpanel") return handleAdminPanel(request, clientIp);
  if (path === "/check-items") {
    const userData = await getUserDataFromKV();
    const username = request.headers.get("X-User") || "";
    const user = userData[username];
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    return handleCheckItems(request, user);
  }
  if (path === "/fetch-banned-users") return fetchBannedUsersEndpoint(request);
  return new Response("Not found", { status: 404 });
}
