// Reference: https://github.com/metowolf/MetingJS

import { Md5 } from 'ts-md5'
import * as CryptoTS from 'crypto-ts'

function encryptParams(url: string, text: string) {
  const message = `nobody${url}use${text}md5forencrypt`
  const digest = Md5.hashStr(message)
  const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`
  return CryptoTS.AES.encrypt(
    CryptoTS.enc.Utf8.parse(data),
    CryptoTS.enc.Utf8.parse('e82ckenh8dichen8'),
    {
      mode: CryptoTS.mode.ECB,
      padding: CryptoTS.pad.PKCS7,
    },
  ).ciphertext!.toString(CryptoTS.enc.Hex)
}

export async function postEapi(path: string, body: any) {
  const response = await fetch(`https://music.163.com/eapi/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      params: encryptParams(`/api/${path}`, JSON.stringify(body)),
    }).toString(),
  })
  return await response.json()
}
