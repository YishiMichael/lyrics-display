chrome.runtime.onMessage.addListener(async (message, _, sendResponse) => {
  if (message.__method__ === 'fetch-json') {
    const response = await fetch(message.input, message.init)
    sendResponse(await response.json())
  }
})
