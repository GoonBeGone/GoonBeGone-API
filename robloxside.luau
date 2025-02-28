local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local GAME_ID = "0"
if game.PlaceId then
	GAME_ID = tostring(game.PlaceId)
else
	warn("Warning: Could not get Game.PlaceId even after waiting. Game ID will be set to '0'.")
end

local WORKER_API_URL = "urworkerurlifyourdoingitonurown"
local API_KEY = "ask-dedcritical-on-discord-for-api-key"

-- Normalize asset IDs
local function normalizeAssetId(assetId)
	if not assetId then return nil end

	if type(assetId) == "string" and assetId:match("http://www%.roblox%.com/asset/%?id=(%d+)") then
		local id = assetId:match("http://www%.roblox%.com/asset/%?id=(%d+)")
		print("Normalized from URL (http):", assetId, "to", "rbxassetid://" .. id)
		return "rbxassetid://" .. id
	end

	if type(assetId) == "string" and assetId:match("https://www%.roblox%.com/asset/%?id=(%d+)") then
		local id = assetId:match("https://www%.roblox%.com/asset/%?id=(%d+)")
		print("Normalized from URL (https):", assetId, "to", "rbxassetid://" .. id)
		return "rbxassetid://" .. id
	end

	if type(assetId) == "number" or (type(assetId) == "string" and tonumber(assetId)) then
		local id = tostring(assetId):match("(%d+)")
		print("Normalized from number/string:", assetId, "to", "rbxassetid://" .. id)
		return "rbxassetid://" .. id
	end

	if type(assetId) == "string" and assetId:match("^rbxassetid://(%d+)$") then
		print("Already normalized:", assetId)
		return assetId
	end

	print("Invalid assetId:", assetId)
	return nil
end

-- Fetch banned users list
local function fetchBannedUsers()
	print("Fetching current banned users list")
	local headers = {
		["X-API-Key"] = API_KEY,
		["X-Game-Id"] = GAME_ID
	}
	local url = WORKER_API_URL .. "/fetch-banned-users"
	print("Fetching banned users from URL: " .. url)

	local success, response = pcall(function()
		return HttpService:GetAsync(
			url,
			false,
			headers
		)
	end)

	if success then
		local decodedResponse = HttpService:JSONDecode(response)
		print("Fetched banned users: " .. HttpService:JSONEncode(decodedResponse))
		return decodedResponse
	else
		warn("Failed to fetch banned users: " .. tostring(response))
		return nil
	end
end

-- Ban a player universally
local function banPlayerUniversally(userId, banReason, bannedItems)
	print("Attempting to universally ban UserId: " .. tostring(userId) .. " for reason: " .. banReason .. " with items: " .. HttpService:JSONEncode(bannedItems))

	local data = {
		userId = tonumber(userId),
		banReason = banReason,
		bannedItems = bannedItems
	}

	local headers = {
		["X-API-Key"] = API_KEY,
		["X-Game-Id"] = GAME_ID
	}
	local url = WORKER_API_URL .. "/ban-user"
	print("Sending ban request to URL: " .. url .. " with data: " .. HttpService:JSONEncode(data))

	local success, response = pcall(function()
		return HttpService:PostAsync(
			url,
			HttpService:JSONEncode(data),
			Enum.HttpContentType.ApplicationJson,
			false,
			headers
		)
	end)

	if success then
		local decodedResponse = HttpService:JSONDecode(response)
		if decodedResponse and decodedResponse.success then
			print("Successfully banned user " .. tostring(userId) .. ": " .. decodedResponse.message)
		else
			warn("Failed to ban user " .. tostring(userId) .. ": " .. (decodedResponse and decodedResponse.message or "Unknown error") .. " Response: " .. response)
		end
	else
		warn("Error banning user: " .. tostring(response))
	end
end

-- Check player's items
local function checkPlayerItems(player)
	print("Starting checkPlayerItems for player: " .. player.Name .. " (UserId: " .. tostring(player.UserId) .. ")")

	local userId = tonumber(player.UserId)
	if not userId then
		warn("Invalid userId for player: " .. player.Name)
		return
	end

	local character = player.Character or player.CharacterAdded:Wait()
	if not character then
		warn("Timeout waiting for character for player: " .. player.Name)
		return
	end

	local humanoid = character:FindFirstChild("Humanoid")
	if not humanoid then
		warn("No humanoid found for player: " .. player.Name)
		return
	end

	local wearingItems = {}
	for _, clothing in pairs(character:GetChildren()) do
		local assetId
		if clothing:IsA("Shirt") then
			assetId = clothing.ShirtTemplate
			print("Raw ShirtTemplate:", assetId)
		elseif clothing:IsA("Pants") then
			assetId = clothing.PantsTemplate
			print("Raw PantsTemplate:", assetId)
		elseif clothing:IsA("ShirtGraphic") then
			assetId = clothing.Graphic
			print("Raw Graphic:", assetId)
		elseif clothing:IsA("Accessory") or clothing:IsA("Hat") or clothing:IsA("Gear") then
			local handle = clothing:FindFirstChild("Handle")
			if handle then
				local mesh = handle:FindFirstChildOfClass("SpecialMesh")
				if mesh then
					assetId = mesh.MeshId
					print("Raw MeshId (SpecialMesh):", assetId)
				else
					local meshPart = handle:FindFirstChildOfClass("MeshPart")
					if meshPart then
						assetId = meshPart.MeshId
						print("Raw MeshId (MeshPart):", assetId)
					end
				end
			end
		end

		if assetId and assetId ~= "" then
			local normalizedId = normalizeAssetId(assetId)
			if normalizedId then
				table.insert(wearingItems, normalizedId)
			end
		end
	end

	local appearanceSuccess, appearanceInfo = pcall(function()
		return Players:GetHumanoidDescriptionFromUserId(userId)
	end)
	if appearanceSuccess and appearanceInfo then
		if appearanceInfo.GraphicTShirt and appearanceInfo.GraphicTShirt ~= 0 then
			local tshirtId = normalizeAssetId(appearanceInfo.GraphicTShirt)
			if tshirtId then
				table.insert(wearingItems, tshirtId)
			end
		end
		-- Fallback for pants ID
		if appearanceInfo.Pants and appearanceInfo.Pants ~= 0 then
			local pantsId = normalizeAssetId(appearanceInfo.Pants)
			if pantsId then
				local found = false
				for _, item in ipairs(wearingItems) do
					if item == pantsId then
						found = true
						break
					end
				end
				if not found then
					print("Added pants ID from HumanoidDescription:", pantsId)
					table.insert(wearingItems, pantsId)
				end
			end
		end
	end

	local data = {
		userId = userId,
		wearingItems = wearingItems
	}
	local headers = {
		["X-API-Key"] = API_KEY,
		["X-Game-Id"] = GAME_ID
	}
	local url = WORKER_API_URL .. "/check-items"
	print("Checking items at URL: " .. url .. " with data: " .. HttpService:JSONEncode(data))

	local success, response = pcall(function()
		return HttpService:PostAsync(
			url,
			HttpService:JSONEncode(data),
			Enum.HttpContentType.ApplicationJson,
			false,
			headers
		)
	end)

	if success then
		local decodedResponse = HttpService:JSONDecode(response)
		print("Check response: " .. HttpService:JSONEncode(decodedResponse))
		if decodedResponse and decodedResponse.isBanned then
			if decodedResponse.banReason == "Wearing banned item" then
				local bannedUsers = fetchBannedUsers()
				if bannedUsers and not table.find(bannedUsers, function(entry) return entry.userId == userId end) then
					banPlayerUniversally(userId, decodedResponse.banReason, decodedResponse.bannedItems)
				end
				player:Kick("You are banned from this game. Reason: " .. decodedResponse.banReason .. " - Items: " .. table.concat(decodedResponse.bannedItems or {}, ", "))
			else
				player:Kick("You are banned from this game. Reason: " .. (decodedResponse.banReason or "Unknown"))
			end
		end
	else
		warn("HTTP request failed for player " .. player.Name .. ": " .. tostring(response))
	end
end

-- Player event listeners
Players.PlayerAdded:Connect(function(player)
	if player.Character then
		task.spawn(function()
			task.wait(2)
			checkPlayerItems(player)
		end)
	end
	player.CharacterAdded:Connect(function()
		task.wait(2)
		checkPlayerItems(player)
	end)
end)

for _, player in ipairs(Players:GetPlayers()) do
	task.spawn(function()
		task.wait(2)
		checkPlayerItems(player)
	end)
end

print("Ban script initialized with Game ID: " .. GAME_ID)
