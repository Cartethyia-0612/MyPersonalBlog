import { describe, expect, it } from 'vitest'

import { describeUserAgent } from '../src/services/deviceInfo'

describe('device user-agent parsing', () => {
  it('maps an OpenHarmony phone to HarmonyOS and Huawei Browser', () => {
    const userAgent =
      'Mozilla/5.0 (Phone; OpenHarmony 7.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 ArkWeb/7.0.0.111 Mobile HuaweiBrowser/6.1.9.323'

    expect(describeUserAgent(userAgent)).toEqual({
      browser: 'Huawei Browser 6',
      os: 'HarmonyOS 7.0',
      deviceType: '手机',
      label: 'Huawei Browser 6 · HarmonyOS 7.0',
    })
  })

  it('keeps desktop and iOS detection intact', () => {
    expect(
      describeUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      ),
    ).toMatchObject({ browser: 'Chrome 131', os: 'Windows 10/11', deviceType: '桌面设备' })

    expect(
      describeUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      ),
    ).toMatchObject({ browser: 'Safari 17', os: 'iOS 17', deviceType: '手机' })
  })
})
