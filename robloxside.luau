local HttpService = game:GetService("HttpService")

local Players = game:GetService("Players")



local API_KEY = "yourkeyhere"

local CHECK_ENDPOINT = "yoururlhere/check-items"

local BAN_ENDPOINT = "yoururlhere/ban-user"



local function checkPlayer(player)

	local userId = tostring(player.UserId)

	local payload = { userId = userId }

	local success, response = pcall(HttpService.RequestAsync, HttpService, {

		Url = CHECK_ENDPOINT,

		Method = "POST",

		Headers = { ["Content-Type"] = "application/json", ["X-API-Key"] = API_KEY },

		Body = HttpService:JSONEncode(payload)

	})

	if success and response.Success then

		local data = HttpService:JSONDecode(response.Body)

		if data.isBanned then

			if data.flaggedItems and #data.flaggedItems > 0 then

				local banSuccess, banResponse = pcall(HttpService.RequestAsync, HttpService, {

					Url = BAN_ENDPOINT,

					Method = "POST",

					Headers = { ["Content-Type"] = "application/json", ["X-API-Key"] = API_KEY },

					Body = HttpService:JSONEncode({ userId = userId, banReason = data.banReason, bannedItems = data.flaggedItems })

				})

				if banSuccess and banResponse.Success then

					print("Banned " .. player.Name)

				else

					warn("Ban failed for " .. player.Name)

				end

			end

			if data.kick then

				player:Kick("Kicked: " .. (data.banReason or "Banned items detected"))

			end

		end

	end

end



Players.PlayerAdded:Connect(function(player)

	player.CharacterAdded:Connect(function()

		task.wait(1)

		checkPlayer(player)

	end)

end)



for _, player in pairs(Players:GetPlayers()) do

	if player.Character then task.spawn(checkPlayer, player) end

end
