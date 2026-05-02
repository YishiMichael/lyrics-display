import { postEapi } from './meting.ts'

chrome.runtime.onMessage.addListener(async (message, _, sendResponse) => {
  if (message.path && message.body) {
    sendResponse(await postEapi(message.path, message.body))
  }
  return true
})
