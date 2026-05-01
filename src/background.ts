// import { useEffect } from 'react'

// console.log(useEffect)

// let pipTab = null

// chrome.runtime.onMessage.addListener((message) => {
//   if (message.type === 'get/streamId') {
//     chrome.runtime.sendMessage({
//       type: 'set/isActive',
//       isActive: message.isActive,
//     })
//   }
// })

// const streamIdMap = new Map<number, string>()

// chrome.tabs.onRemoved.addListener((tabId) => {
//   streamIdMap.delete(tabId);
// });

// chrome.runtime.onInstalled.addListener(() => {
//   // Page actions are disabled by default and enabled on select tabs
//   chrome.action.disable();

//   // Clear all rules to ensure only our expected rules are set
//   chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
//     // Declare a rule to enable the action on example.com pages
//     let exampleRule = {
//       conditions: [
//         new chrome.declarativeContent.PageStateMatcher({
//           pageUrl: {hostSuffix: '.example.com'},
//         })
//       ],
//       actions: [new chrome.declarativeContent.ShowAction()],
//     };

//     // Finally, apply our new array of rules
//     let rules = [exampleRule];
//     chrome.declarativeContent.onPageChanged.addRules(rules);
//   });
// });

// chrome.runtime.onInstalled.addListener(() => {
//   chrome.action.setBadgeText({
//     text: 'OFF',
//   });
// });

// chrome.action.onClicked.addListener(async (tab) => {
//   // We retrieve the action badge to check if the extension is 'ON' or 'OFF'
//   const prevState = await chrome.action.getBadgeText({ tabId: tab.id });
//   // Next state will always be the opposite
//   const nextState = prevState === 'ON' ? 'OFF' : 'ON';

//   // Set the action badge to the next state
//   await chrome.action.setBadgeText({
//     tabId: tab.id,
//     text: nextState
//   });

//   if (nextState === 'ON') {
//     const streamId = await chrome.tabCapture.getMediaStreamId()
//     await chrome.tabs.sendMessage(tab.id!, {
//       streamId,
//     })
//     // Insert the CSS file when the user turns the extension on
//     await chrome.scripting.insertCSS({
//       files: ['focus-mode.css'],
//       target: { tabId: tab.id }
//     });
//   } else if (nextState === 'OFF') {
//     // Remove the CSS file when the user turns the extension off
//     await chrome.scripting.removeCSS({
//       files: ['focus-mode.css'],
//       target: { tabId: tab.id }
//     });
//   }
// });

// chrome.action.onClicked.addListener((tab) => {
//   chrome.scripting.executeScript({
//     target: { tabId: tab.id! },
//     files: ['src/content/main.tsx-loader.js'],
//   })
// })

// chrome.commands.onCommand.addListener(async (command) => {
//   switch (command) {
//   case 'toggle_app':
//     const [tab] = await chrome.tabs.query({
//       active: true,
//       currentWindow: true,
//     })
//     const tabId = tab?.id
//     if (!tabId) {
//       return
//     }
//     try {
//       await chrome.tabs.sendMessage(tabId, {
//         type: 'command/toggleApp',
//         streamId: await chrome.tabCapture.getMediaStreamId(),
//       })
//     } catch (err) {
//       console.warn('No receiver in tab', err)
//     }
//     return
//   }
// })

// chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
//   if (message === 'get/streamId') {
//     const streamId = await chrome.tabCapture.getMediaStreamId({
//       consumerTabId: sender.tab?.id,
//     })
//     sendResponse({ streamId })
//   }
// })
